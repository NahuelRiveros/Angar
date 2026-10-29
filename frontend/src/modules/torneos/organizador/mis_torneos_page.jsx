import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, MapPin, Plus, Trophy } from "lucide-react";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import { useMiSuscripcion } from "../../../hooks/use_mi_suscripcion.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { getMisTorneos, crearTorneo } from "../api/torneos_api.js";
import { EstadoTorneo } from "../comun/torneo_ui.jsx";
import AvisoSoloLectura from "../comun/aviso_solo_lectura.jsx";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

const esquemaNuevoTorneo = z.object({
  nombre: z.string().trim().min(3, "Mínimo 3 caracteres.").max(120, "Hasta 120 caracteres."),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  sede: z.string().trim().max(120, "Hasta 120 caracteres."),
}).refine((d) => !d.fecha_inicio || !d.fecha_fin || d.fecha_fin >= d.fecha_inicio, { path: ["fecha_fin"], message: "No puede ser anterior al inicio." });

export default function MisTorneosPage() {
  const [page, setPage] = useState(1);
  const [creando, setCreando] = useState(false);
  const plan = useMiSuscripcion();
  const torneos = useQuery({ queryKey: ["torneos", "mios", page], queryFn: () => getMisTorneos({ page }), placeholderData: keepPreviousData });
  const soloLectura = plan.data?.es_organizador && !plan.data.vigente;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kt-display text-2xl font-bold text-(--kt-ink) sm:text-3xl">Mis torneos</h1>
          <p className="mt-1 text-sm text-(--kt-ink-soft)">Creá tus torneos, cargá categorías, reglamento y premios.</p>
        </div>
        <button type="button" disabled={soloLectura} onClick={() => setCreando(true)} className={`${BOTON} bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover)`}>
          <Plus size={18} aria-hidden="true" /> Nuevo torneo
        </button>
      </div>

      {soloLectura && <AvisoSoloLectura mensaje={plan.data.mensaje} />}

      {torneos.isPending && <AdminSpinner />}
      {torneos.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(torneos.error, "No pudimos cargar tus torneos.")} />
          <button type="button" onClick={() => torneos.refetch()} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {torneos.data?.total === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Trophy size={36} aria-hidden="true" className="mx-auto text-(--kt-teal-700)" />
          <p className="mt-3 font-semibold text-(--kt-ink)">Todavía no creaste ningún torneo</p>
          <p className="mt-1 text-sm text-(--kt-ink-soft)">Empezá con el nombre y la fecha; el resto lo completás después.</p>
        </div>
      )}
      {torneos.data?.data.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {torneos.data.data.map((t) => (
            <li key={t.id}>
              <Link to={`/mis-torneos/${t.id}`} className="block h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-(--kt-teal-700) focus-visible:ring-2 focus-visible:ring-(--kt-turquoise) focus-visible:outline-none">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-(--kt-ink)">{t.nombre}</p>
                  <EstadoTorneo estado={t.estado} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-(--kt-ink-soft)">
                  <CalendarDays size={15} aria-hidden="true" />
                  {t.fecha_inicio ? formatearFechaAR(t.fecha_inicio) : "Sin fecha"}{t.fecha_fin && t.fecha_fin !== t.fecha_inicio ? ` al ${formatearFechaAR(t.fecha_fin)}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-(--kt-ink-soft)">
                  <MapPin size={15} aria-hidden="true" /> {t.sede || "Sin sede"}
                </p>
                <p className="mt-2 text-xs font-semibold text-(--kt-ink-soft)">{t.cantidad_categorias} categoría{t.cantidad_categorias === 1 ? "" : "s"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {torneos.data && <Pagination page={torneos.data.page} pages={torneos.data.totalPages} total={torneos.data.total} onChange={setPage} />}
      {creando && <NuevoTorneoModal onClose={() => setCreando(false)} />}
    </div>
  );
}

function NuevoTorneoModal({ onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquemaNuevoTorneo), defaultValues: { nombre: "", fecha_inicio: "", fecha_fin: "", sede: "" },
  });
  const crear = useMutation({
    mutationFn: crearTorneo,
    onSuccess: async (r) => {
      toast.success(r.mensaje);
      queryClient.setQueryData(["torneos", r.data.id], r.data);
      await queryClient.invalidateQueries({ queryKey: ["torneos", "mios"] });
      navigate(`/mis-torneos/${r.data.id}`);
    },
  });

  return (
    <Modal title="Nuevo torneo" onClose={onClose} busy={crear.isPending}>
      <form noValidate onSubmit={handleSubmit((datos) => crear.mutate(datos))} className="space-y-4">
        <InputField label="Nombre del torneo" name="nombre" placeholder="Ej: Abierto de Verano" maxLength={120} register={register} error={errors.nombre?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Empieza (opcional)" name="fecha_inicio" type="date" register={register} error={errors.fecha_inicio?.message} />
          <InputField label="Termina (opcional)" name="fecha_fin" type="date" register={register} error={errors.fecha_fin?.message} />
        </div>
        <InputField label="Sede (opcional)" name="sede" placeholder="Ej: Club Norte" maxLength={120} register={register} error={errors.sede?.message} />
        {crear.isError && <ErrorBanner message={mensajeDe(crear.error, "No pudimos crear el torneo. Probá de nuevo.")} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={crear.isPending} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={crear.isPending} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>{crear.isPending ? "Creando…" : "Crear torneo"}</button>
        </div>
      </form>
    </Modal>
  );
}
