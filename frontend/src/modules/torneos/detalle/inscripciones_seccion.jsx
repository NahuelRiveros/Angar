import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, MessageCircle, Pencil, Plus, Star, UserMinus, X } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { ESTADOS_INSCRIPCION, PERMITIDO } from "../../../../../torneo_config.js";
import { getInscripciones, cargarPareja, editarPareja, resolverInscripcion } from "../api/torneos_api.js";
import { mensajeDe } from "./use_cambio_torneo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const COLORES = { esperando: "bg-sky-50 text-sky-900 ring-sky-200", pendiente: "bg-amber-50 text-amber-900 ring-amber-200", confirmada: "bg-emerald-50 text-emerald-800 ring-emerald-200", rechazada: "bg-red-50 text-red-800 ring-red-200", cancelada: "bg-slate-100 text-slate-600 ring-slate-200" };
// Primero lo que pide una acción.
const ORDEN = { pendiente: 0, esperando: 1, confirmada: 2, rechazada: 3, cancelada: 4 };
const claveInscripciones = (torneoId) => ["torneos", Number(torneoId), "inscripciones"];

const nombre = z.string().trim().min(3, "Nombre y apellido (mínimo 3 caracteres).").max(80, "Hasta 80 caracteres.");
const esquema = z.object({
  categoria_id: z.string().min(1, "Elegí la categoría."),
  jugador1_nombre: nombre,
  jugador2_nombre: nombre,
  telefono: z.string().trim().refine((v) => v === "" || /^[0-9+()\s-]{6,40}$/.test(v), "Solo números, espacios, +, - y paréntesis."),
  cabeza_de_serie: z.boolean(),
});

/** Acción sobre inscripciones: muestra el mensaje y refresca inscripciones y zonas. */
function useAccionInscripcion(torneoId, accion, { onExito } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: accion,
    onSuccess: async (r) => {
      toast.success(r.mensaje);
      await queryClient.invalidateQueries({ queryKey: ["torneos", Number(torneoId)] });
      onExito?.(r);
    },
    onError: (e) => toast.error(mensajeDe(e, "No se pudo completar la acción.")),
  });
}

export default function InscripcionesSeccion({ torneo, editable }) {
  const [categoria, setCategoria] = useState("");
  const [modal, setModal] = useState(null); // { tipo: "pareja", inscripcion? } | { tipo: "rechazar" | "baja", inscripcion }
  const lista = useQuery({ queryKey: claveInscripciones(torneo.id), queryFn: () => getInscripciones(torneo.id) });
  const confirmar = useAccionInscripcion(torneo.id, (i) => resolverInscripcion(torneo.id, i.id, "confirmar"));
  const nombreCategoria = new Map(torneo.categorias.map((c) => [c.id, c.nombre]));
  const puedeSumar = editable && PERMITIDO.cargarParejas.includes(torneo.estado);

  if (lista.isPending) return <AdminSpinner />;
  if (lista.isError) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={mensajeDe(lista.error, "No pudimos cargar las inscripciones.")} />
        <button type="button" onClick={() => lista.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>
      </div>
    );
  }
  const filas = lista.data.filter((i) => !categoria || i.categoria_id === Number(categoria)).sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || a.id - b.id);
  const pendientes = lista.data.filter((i) => i.estado === "pendiente").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-48 flex-1 sm:max-w-xs">
          <SelectField label="Categoría" name="filtro-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Todas"
            options={torneo.categorias.map((c) => ({ value: String(c.id), label: c.nombre }))} />
        </div>
        {puedeSumar && (
          <button type="button" disabled={!torneo.categorias.length} onClick={() => setModal({ tipo: "pareja" })} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>
            <Plus size={16} aria-hidden="true" /> Agregar pareja
          </button>
        )}
      </div>
      {pendientes > 0 && <p role="status" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Tenés {pendientes === 1 ? "1 inscripción online" : `${pendientes} inscripciones online`} para revisar.</p>}
      {filas.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">Todavía no hay parejas anotadas.</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        {filas.map((i) => {
          const activa = ["esperando", "pendiente", "confirmada"].includes(i.estado);
          return (
            <li key={i.id} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${activa ? "" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-(--kt-ink)">
                    {i.cabeza_de_serie && <Star size={14} aria-label="Cabeza de serie" className="mr-1 inline fill-amber-400 text-amber-500" />}
                    {i.jugador1_nombre} / {i.jugador2_nombre}
                  </p>
                  <p className="text-xs text-(--kt-ink-soft)">{nombreCategoria.get(i.categoria_id)} · {i.origen === "online" ? "Se anotó online" : "Cargada por vos"}</p>
                  {i.estado === "esperando" && <p className="text-xs text-sky-900">Invitó a su compañero por código: cuando acepte, la podés confirmar.</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${COLORES[i.estado]}`}>{ESTADOS_INSCRIPCION[i.estado]}</span>
              </div>
              {i.telefono && (
                <a href={`https://wa.me/${i.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline">
                  <MessageCircle size={15} aria-hidden="true" /> {i.telefono}
                </a>
              )}
              {i.nota && <p className="mt-1 text-sm text-(--kt-ink)">“{i.nota}”</p>}
              {i.motivo_rechazo && <p className="mt-1 text-sm text-red-700">Rechazada: {i.motivo_rechazo}</p>}
              {editable && activa && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {i.estado === "pendiente" && PERMITIDO.cargarParejas.includes(torneo.estado) && (
                    <button type="button" disabled={confirmar.isPending} onClick={() => confirmar.mutate(i)} className={`${BOTON} border-emerald-200 bg-emerald-50 text-emerald-800`}><Check size={15} aria-hidden="true" /> Confirmar</button>
                  )}
                  {["pendiente", "esperando"].includes(i.estado) && <button type="button" onClick={() => setModal({ tipo: "rechazar", inscripcion: i })} className={`${BOTON} border-red-200 bg-red-50 text-red-800`}><X size={15} aria-hidden="true" /> Rechazar</button>}
                  <button type="button" onClick={() => setModal({ tipo: "pareja", inscripcion: i })} aria-label={`Editar ${i.jugador1_nombre} / ${i.jugador2_nombre}`} className={`${BOTON} border-slate-300 bg-white text-slate-700`}><Pencil size={15} aria-hidden="true" /> Editar</button>
                  {!i.zona_id && <button type="button" onClick={() => setModal({ tipo: "baja", inscripcion: i })} className={`${BOTON} border-slate-300 bg-white text-slate-700`}><UserMinus size={15} aria-hidden="true" /> Dar de baja</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {modal?.tipo === "pareja" && <ParejaModal torneo={torneo} inscripcion={modal.inscripcion} onClose={() => setModal(null)} />}
      {modal?.tipo === "rechazar" && <RechazoModal torneo={torneo} inscripcion={modal.inscripcion} onClose={() => setModal(null)} />}
      <BajaDialogo torneo={torneo} inscripcion={modal?.tipo === "baja" ? modal.inscripcion : null} onClose={() => setModal(null)} />
    </div>
  );
}

function ParejaModal({ torneo, inscripcion, onClose }) {
  const editar = Boolean(inscripcion);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      categoria_id: String(inscripcion?.categoria_id ?? (torneo.categorias.length === 1 ? torneo.categorias[0].id : "")),
      jugador1_nombre: inscripcion?.jugador1_nombre ?? "", jugador2_nombre: inscripcion?.jugador2_nombre ?? "",
      telefono: inscripcion?.telefono ?? "", cabeza_de_serie: inscripcion?.cabeza_de_serie ?? false,
    },
  });
  const guardar = useAccionInscripcion(torneo.id,
    ({ categoria_id, ...datos }) => (editar ? editarPareja(torneo.id, inscripcion.id, datos) : cargarPareja(torneo.id, { ...datos, categoria_id: Number(categoria_id) })),
    { onExito: onClose });

  return (
    <Modal title={editar ? "Editar pareja" : "Agregar pareja"} onClose={onClose} busy={guardar.isPending}>
      <form noValidate onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-4">
        {!editar && <p className="text-sm text-(--kt-ink-soft)">Las parejas que cargás vos entran confirmadas.</p>}
        <SelectField label="Categoría" name="categoria_id" register={register} error={errors.categoria_id?.message} disabled={editar} placeholder="Elegí"
          options={torneo.categorias.map((c) => ({ value: String(c.id), label: c.nombre }))} />
        <InputField label="Jugador 1" name="jugador1_nombre" placeholder="Nombre y apellido" maxLength={80} register={register} error={errors.jugador1_nombre?.message} />
        <InputField label="Jugador 2" name="jugador2_nombre" placeholder="Nombre y apellido" maxLength={80} register={register} error={errors.jugador2_nombre?.message} />
        <InputField label="Teléfono (opcional)" name="telefono" type="tel" inputMode="tel" placeholder="Para avisarles horarios" maxLength={40} register={register} error={errors.telefono?.message} />
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-(--kt-ink)">
          <input type="checkbox" {...register("cabeza_de_serie")} className="h-5 w-5" /> Cabeza de serie (va a una zona distinta de las otras cabezas)
        </label>
        {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar la pareja.")} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={guardar.isPending} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={guardar.isPending} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>{guardar.isPending ? "Guardando…" : editar ? "Guardar cambios" : "Agregar pareja"}</button>
        </div>
      </form>
    </Modal>
  );
}

const esquemaRechazo = z.object({ motivo: z.string().trim().min(5, "Contale el motivo (mínimo 5 caracteres).").max(300, "Hasta 300 caracteres.") });

function RechazoModal({ torneo, inscripcion, onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(esquemaRechazo), defaultValues: { motivo: "" } });
  const rechazar = useAccionInscripcion(torneo.id, ({ motivo }) => resolverInscripcion(torneo.id, inscripcion.id, "rechazar", { motivo }), { onExito: onClose });
  return (
    <Modal title={`Rechazar · ${inscripcion.jugador1_nombre} / ${inscripcion.jugador2_nombre}`} onClose={onClose} busy={rechazar.isPending}>
      <form noValidate onSubmit={handleSubmit((d) => rechazar.mutate(d))} className="space-y-4">
        <p className="text-sm text-(--kt-ink-soft)">La pareja ve este motivo en "Mis inscripciones".</p>
        <InputField label="Motivo" name="motivo" placeholder="Ej: no se recibió el pago de la inscripción" maxLength={300} register={register} error={errors.motivo?.message} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={rechazar.isPending} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={rechazar.isPending} className={`${BOTON} border-red-700 bg-red-700 text-white`}>{rechazar.isPending ? "Rechazando…" : "Rechazar inscripción"}</button>
        </div>
      </form>
    </Modal>
  );
}

function BajaDialogo({ torneo, inscripcion, onClose }) {
  const baja = useAccionInscripcion(torneo.id, (i) => resolverInscripcion(torneo.id, i.id, "baja"), { onExito: onClose });
  return (
    <ConfirmDialog open={Boolean(inscripcion)} loading={baja.isPending} confirmLabel="Dar de baja"
      title={`¿Dar de baja a ${inscripcion?.jugador1_nombre ?? ""} / ${inscripcion?.jugador2_nombre ?? ""}?`}
      message="Deja de figurar en la categoría y libera su lugar." onClose={onClose} onConfirm={() => baja.mutate(inscripcion)} />
  );
}
