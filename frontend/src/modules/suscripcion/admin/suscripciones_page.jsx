import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, History, PlusCircle } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { tienePermiso } from "../../../../../permisos_config.js";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import DataGrid from "../../../controls/ui/data_grid.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import SearchField from "../../../controls/ui/search_field.jsx";
import { getSuscripciones, getPagosDeUsuario, extenderSuscripcion, fijarVencimientoSuscripcion } from "../../../api/suscripcion_api.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { ESTADOS_PLAN, ORIGENES_PAGO, ESTADOS_PAGO, formatearPesos, formatearMomento } from "../estado_plan.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const nombreDe = (fila) => `${fila.nombre} ${fila.apellido}`.trim();

// Mismos límites que valida el servidor (suscripcion_reglas.js).
const nota = z.string().trim().max(300, "Hasta 300 caracteres.");
const esquemaExtender = z.object({
  dias: z.coerce.number({ message: "Indicá los días." }).int("Solo días enteros.").min(1, "Mínimo 1 día.").max(365, "Máximo 365 días."),
  nota,
});
const esquemaFijar = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí una fecha."),
  nota,
});

export default function SuscripcionesPage() {
  const { usuario } = useAuth();
  const puedeGestionar = tienePermiso(usuario, "suscripciones.gestionar");
  const [filtros, setFiltros] = useState({ busqueda: "", estado: "", page: 1, limit: 20 });
  const [accion, setAccion] = useState(null); // { tipo: "extender" | "fijar" | "pagos", fila }

  const lista = useQuery({
    queryKey: ["suscripciones", "admin", filtros],
    queryFn: () => getSuscripciones(filtros),
    placeholderData: keepPreviousData,
  });
  const cambiar = (cambios) => setFiltros((previo) => ({ ...previo, page: 1, ...cambios }));

  const columnas = [
    {
      key: "nombre", label: "Organizador",
      render: (f) => <div><p className="font-semibold">{nombreDe(f)}</p><p className="text-xs text-slate-500">{f.email}</p></div>,
    },
    { key: "estado", label: "Estado", render: (f) => <EtiquetaEstado estado={f.estado} /> },
    { key: "fecha_vencimiento", label: "Vence", render: (f) => formatearFechaAR(f.fecha_vencimiento) },
    { key: "dias_restantes", label: "Días", align: "right", render: (f) => (f.vigente ? f.dias_restantes : "—") },
  ];
  const acciones = [
    { key: "pagos", label: "Historial", icon: <History size={13} />, onClick: (fila) => setAccion({ tipo: "pagos", fila }) },
    ...(puedeGestionar ? [
      { key: "extender", label: "Sumar días", icon: <PlusCircle size={13} />, variant: "success", onClick: (fila) => setAccion({ tipo: "extender", fila }) },
      { key: "fijar", label: "Fijar fecha", icon: <CalendarClock size={13} />, variant: "warning", onClick: (fila) => setAccion({ tipo: "fijar", fila }) },
    ] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      <div>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Suscripciones</h1>
        <p className="text-sm text-(--kt-ink-soft)">Organizadores, vencimientos y pagos. Las extensiones manuales sirven para transferencias, cortesías o correcciones.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        <FiltroEstado activo={!filtros.estado} onClick={() => cambiar({ estado: "" })}>Todos</FiltroEstado>
        {Object.entries(ESTADOS_PLAN).map(([codigo, { etiqueta }]) => (
          <FiltroEstado key={codigo} activo={filtros.estado === codigo} onClick={() => cambiar({ estado: codigo })}>
            {etiqueta}{lista.data?.resumen ? ` (${lista.data.resumen[codigo]})` : ""}
          </FiltroEstado>
        ))}
      </div>
      <SearchField label="Buscar organizador" placeholder="Nombre, apellido o email" value={filtros.busqueda} onSearch={(busqueda) => cambiar({ busqueda })} />

      {lista.isPending && <AdminSpinner />}
      {lista.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(lista.error, "No pudimos cargar las suscripciones.")} />
          <button type="button" onClick={() => lista.refetch()} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {lista.data && (
        <ListaMovil filas={lista.data.data} acciones={acciones} vacio={filtros.busqueda || filtros.estado ? "Ningún organizador coincide con el filtro." : "Todavía no hay organizadores."}
          paginacion={lista.data} onPagina={(page) => setFiltros((previo) => ({ ...previo, page }))} />
      )}
      {/* Desde tablets, la tabla; en el celular, tarjetas con las acciones a la vista. */}
      {lista.data && (
        <div className="hidden md:block"><DataGrid rows={lista.data.data} keyField="usuario_id" columns={columnas} actions={acciones} searchable={false}
          loading={lista.isFetching} emptyMessage={filtros.busqueda || filtros.estado ? "Ningún organizador coincide con el filtro." : "Todavía no hay organizadores."}
          page={lista.data.page} totalPages={lista.data.totalPages} totalRows={lista.data.total} pageSize={filtros.limit}
          onPageChange={(page) => setFiltros((previo) => ({ ...previo, page }))} onPageSizeChange={(limit) => cambiar({ limit })} /></div>
      )}

      {accion?.tipo === "pagos" && <PagosModal fila={accion.fila} onClose={() => setAccion(null)} />}
      {accion?.tipo === "extender" && <MovimientoModal tipo="extender" fila={accion.fila} onClose={() => setAccion(null)} />}
      {accion?.tipo === "fijar" && <MovimientoModal tipo="fijar" fila={accion.fila} onClose={() => setAccion(null)} />}
    </div>
  );
}

const TONOS_ACCION = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  default: "border-slate-300 bg-white text-slate-700",
};

function ListaMovil({ filas, acciones, vacio, paginacion, onPagina }) {
  return (
    <div className="md:hidden">
      {filas.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-(--kt-ink-soft)">{vacio}</p>}
      <ul className="space-y-3">
        {filas.map((fila) => (
          <li key={fila.usuario_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{nombreDe(fila)}</p>
                <p className="truncate text-xs text-slate-500">{fila.email}</p>
              </div>
              <EtiquetaEstado estado={fila.estado} />
            </div>
            <p className="mt-2 text-sm text-(--kt-ink-soft)">
              {fila.vigente ? "Vence" : "Venció"} el <strong className="text-(--kt-ink)">{formatearFechaAR(fila.fecha_vencimiento)}</strong>
              {fila.vigente ? ` · ${fila.dias_restantes} días` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {acciones.map((a) => (
                <button key={a.key} type="button" onClick={() => a.onClick(fila)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${TONOS_ACCION[a.variant] ?? TONOS_ACCION.default}`}>
                  {a.icon}{a.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={paginacion.page} pages={paginacion.totalPages} total={paginacion.total} onChange={onPagina} />
    </div>
  );
}

function EtiquetaEstado({ estado }) {
  const { etiqueta, clase } = ESTADOS_PLAN[estado] ?? ESTADOS_PLAN.activo;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${clase}`}>{etiqueta}</span>;
}

function FiltroEstado({ activo, onClick, children }) {
  return (
    <button type="button" aria-pressed={activo} onClick={onClick}
      className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${activo ? "border-(--kt-petrol) bg-(--kt-petrol) text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
      {children}
    </button>
  );
}

function MovimientoModal({ tipo, fila, onClose }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const extender = tipo === "extender";
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(extender ? esquemaExtender : esquemaFijar),
    defaultValues: extender ? { dias: 30, nota: "" } : { fecha: fila.fecha_vencimiento, nota: "" },
  });
  const guardar = useMutation({
    mutationFn: (datos) => (extender ? extenderSuscripcion(fila.usuario_id, datos) : fijarVencimientoSuscripcion(fila.usuario_id, datos)),
    onSuccess: async (r) => {
      toast.success(r.mensaje);
      await queryClient.invalidateQueries({ queryKey: ["suscripciones"] });
      onClose();
    },
  });

  return (
    <Modal title={`${extender ? "Sumar días" : "Fijar vencimiento"} · ${nombreDe(fila)}`} onClose={onClose} busy={guardar.isPending}>
      <form noValidate onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="space-y-4">
        <p className="text-sm text-(--kt-ink-soft)">
          {fila.vigente ? "Vence el" : "Venció el"} <strong className="text-(--kt-ink)">{formatearFechaAR(fila.fecha_vencimiento)}</strong>.{" "}
          {extender ? "Los días se suman al vencimiento, o desde hoy si ya venció." : "El plan pasa a vencer exactamente en la fecha que elijas."}
        </p>
        {extender
          ? <InputField label="Días a sumar" name="dias" type="number" inputMode="numeric" min={1} max={365} register={register} error={errors.dias?.message} />
          : <InputField label="Nuevo vencimiento" name="fecha" type="date" register={register} error={errors.fecha?.message} />}
        <InputField label="Nota (opcional)" name="nota" placeholder="Ej: transferencia del 27/10" maxLength={300} register={register} error={errors.nota?.message} />
        {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No se pudo guardar. Probá de nuevo.")} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={guardar.isPending} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={guardar.isPending} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>
            {guardar.isPending ? "Guardando…" : extender ? "Sumar días" : "Fijar fecha"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PagosModal({ fila, onClose }) {
  const pagos = useQuery({ queryKey: ["suscripciones", "pagos", fila.usuario_id], queryFn: () => getPagosDeUsuario(fila.usuario_id) });
  return (
    <Modal title={`Historial · ${nombreDe(fila)}`} onClose={onClose}>
      {pagos.isPending && <AdminSpinner />}
      {pagos.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(pagos.error, "No pudimos cargar el historial.")} />
          <button type="button" onClick={() => pagos.refetch()} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {pagos.data?.length === 0 && <p className="text-sm text-(--kt-ink-soft)">Sin movimientos: está en su prueba gratis.</p>}
      {pagos.data?.length > 0 && (
        <ul className="divide-y divide-(--kt-border)">
          {pagos.data.map((p) => (
            <li key={p.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{ORIGENES_PAGO[p.origen] ?? p.origen} · {ESTADOS_PAGO[p.estado] ?? p.estado}</p>
                {p.monto != null && <span className="font-bold">{formatearPesos(p.monto)}</span>}
              </div>
              <p className="text-xs text-(--kt-ink-soft)">
                {formatearMomento(p.creado_en)}
                {p.vencimiento_nuevo ? ` · ${formatearFechaAR(p.vencimiento_anterior)} → ${formatearFechaAR(p.vencimiento_nuevo)}` : ""}
                {p.dias > 0 ? ` (+${p.dias} días)` : ""}
              </p>
              {p.nota && <p className="mt-1 text-xs text-(--kt-ink)">{p.nota}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
