import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Award, CalendarDays, MapPin, MessageCircle } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { authLink } from "../../../controls/acceso/return_to.js";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { PUESTOS } from "../../../../../torneo_config.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { getTorneoPublico, anotarme } from "../api/torneos_api.js";
import { EstadoTorneo } from "../torneo_ui.jsx";
import BotonCompartir from "./boton_compartir.jsx";
import ResultadosPublicos from "./resultados_publicos.jsx";
import ParticipantesPublicos from "./participantes_publicos.jsx";
import DatosDeCobro from "./datos_cobro.jsx";
import { formatearPesos } from "../../suscripcion/estado_plan.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

// Mismo formato que valida el servidor (codigo_jugador.js): MP- y 5 letras o números sin confusos.
const CODIGO = /^(MP-?)?[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}$/i;
const esquema = z.object({
  categoria_id: z.string().min(1, "Elegí la categoría."),
  modo: z.enum(["nombre", "codigo"]),
  jugador2_nombre: z.string().trim().max(80, "Hasta 80 caracteres."),
  codigo_companiero: z.string().trim(),
  telefono: z.string().trim().refine((v) => v === "" || /^[0-9+()\s-]{6,40}$/.test(v), "Solo números, espacios, +, - y paréntesis."),
  nota: z.string().trim().max(300, "Hasta 300 caracteres."),
}).superRefine((d, ctx) => {
  if (d.modo === "nombre" && d.jugador2_nombre.length < 3) ctx.addIssue({ code: "custom", path: ["jugador2_nombre"], message: "Nombre y apellido de tu compañero (mínimo 3 caracteres)." });
  if (d.modo === "codigo" && !CODIGO.test(d.codigo_companiero.replace(/\s+/g, ""))) ctx.addIssue({ code: "custom", path: ["codigo_companiero"], message: "El código tiene la forma MP-XXXXX (tu compañero lo ve en su perfil)." });
});

export default function TorneoPublicoPage() {
  const { torneoId } = useParams();
  const torneo = useQuery({ queryKey: ["publico", "torneo", Number(torneoId)], queryFn: () => getTorneoPublico(torneoId), staleTime: 60_000 });

  if (torneo.isPending) return <div className="p-8"><AdminSpinner /></div>;
  if (torneo.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-8">
        <ErrorBanner message={mensajeDe(torneo.error, "No pudimos cargar el torneo.")} />
        <Link to="/torneos" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Ver todos los torneos</Link>
      </div>
    );
  }
  const t = torneo.data;
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Link to="/torneos" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline"><ArrowLeft size={16} aria-hidden="true" /> Torneos</Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="kt-display text-2xl font-bold text-(--kt-ink) sm:text-3xl">{t.nombre}</h1>
          <EstadoTorneo estado={t.estado} />
          <BotonCompartir titulo={t.nombre} ruta={`/torneos/${t.id}`} className="sm:ml-auto" />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-(--kt-ink-soft)"><CalendarDays size={15} aria-hidden="true" />{t.fecha_inicio ? formatearFechaAR(t.fecha_inicio) : "Fecha a confirmar"}{t.fecha_fin && t.fecha_fin !== t.fecha_inicio ? ` al ${formatearFechaAR(t.fecha_fin)}` : ""}</p>
        <p className="flex items-center gap-1.5 text-sm text-(--kt-ink-soft)"><MapPin size={15} aria-hidden="true" />{[t.sede, t.direccion, t.localidad].filter(Boolean).join(", ")}</p>
        {t.contacto && <p className="flex items-center gap-1.5 text-sm text-(--kt-ink-soft)"><MessageCircle size={15} aria-hidden="true" />Organización: {t.contacto}</p>}
        {t.descripcion && <p className="text-sm leading-relaxed text-(--kt-ink)">{t.descripcion}</p>}
      </header>

      {t.inscripcion_abierta && <Anotarme torneo={t} />}
      {["en_juego", "finalizado"].includes(t.estado) && <ResultadosPublicos torneo={t} />}
      <ParticipantesPublicos torneoId={t.id} />

      <section aria-labelledby="categorias-titulo" className="space-y-3">
        <h2 id="categorias-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Categorías y premios</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {t.categorias.map((c) => (
            <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-(--kt-ink)">{c.nombre}</h3>
                <span className="shrink-0 text-xs font-semibold text-(--kt-ink-soft)">
                  {c.cupo_parejas ? (c.lugares_libres ? `${c.lugares_libres} lugar${c.lugares_libres === 1 ? "" : "es"}` : "Cupo completo") : `${c.confirmadas} pareja${c.confirmadas === 1 ? "" : "s"}`}
                </span>
              </div>
              {c.monto_inscripcion && <p className="mt-1 text-sm font-semibold text-(--kt-ink)">Inscripción: {formatearPesos(c.monto_inscripcion)} por pareja</p>}
              {c.premios.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {c.premios.map((p, i) => (
                    <li key={i} className="flex gap-1.5"><Award size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600" />
                      <span><strong>{p.puesto === "otro" ? p.etiqueta : PUESTOS[p.puesto]}:</strong> {p.descripcion}</span></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <DatosDeCobro torneo={t}>
          <p className="text-xs text-(--kt-ink-soft)">Después de anotarte, mandá el comprobante desde "Mis inscripciones": la organización lo revisa y confirma tu lugar.</p>
        </DatosDeCobro>
      </section>

      {t.reglamento && (
        <section aria-labelledby="reglamento-titulo" className="space-y-2">
          <h2 id="reglamento-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Reglamento</h2>
          <p className="whitespace-pre-line rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-(--kt-ink)">{t.reglamento}</p>
        </section>
      )}
    </div>
  );
}

function Anotarme({ torneo }) {
  const { isAuth } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const conLugar = torneo.categorias.filter((c) => c.lugares_libres !== 0);
  const categoriaDe = (id) => torneo.categorias.find((c) => c.id === Number(id));
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { categoria_id: conLugar.length === 1 ? String(conLugar[0].id) : "", modo: "nombre", jugador2_nombre: "", codigo_companiero: "", telefono: "", nota: "" },
  });
  const [modo, categoriaElegida] = useWatch({ control, name: ["modo", "categoria_id"] });
  const monto = categoriaDe(categoriaElegida)?.monto_inscripcion;
  const anotar = useMutation({
    // Se manda solo una de las dos formas de indicar al compañero.
    mutationFn: ({ modo: forma, jugador2_nombre: nombre, codigo_companiero: codigo, ...d }) => anotarme({
      ...d, torneo_id: torneo.id, categoria_id: Number(d.categoria_id),
      ...(forma === "codigo" ? { codigo_companiero: codigo } : { jugador2_nombre: nombre }),
    }),
    onSuccess: async (r, datos) => {
      const aPagar = Boolean(categoriaDe(datos.categoria_id)?.monto_inscripcion && r.data?.id);
      // Con invitación por código manda el aviso del servidor (dice que falta que el compañero acepte).
      toast.success(aPagar && r.data.estado === "pendiente" ? "¡Te anotaste! Ahora transferí y mandá el comprobante para confirmar tu lugar." : r.mensaje);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["mis-inscripciones"] });
      // Si la categoría cobra, directo a la cuenta para transferir y el botón del comprobante.
      if (aPagar) navigate(`/mis-inscripciones?pagar=${r.data.id}&nueva=1`);
    },
  });

  return (
    <section aria-labelledby="anotarme-titulo" className="rounded-3xl border border-(--kt-border) bg-white p-5 shadow-sm sm:p-6">
      <h2 id="anotarme-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Anotate</h2>
      {!isAuth ? (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-(--kt-ink-soft)">Para anotarte necesitás una cuenta (es gratis).</p>
          <div className="flex flex-wrap gap-2">
            <Link to={authLink("/login", location.pathname)} className={`${BOTON} bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover)`}>Ingresar para anotarme</Link>
            <Link to={authLink("/register", location.pathname)} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Crear cuenta</Link>
          </div>
        </div>
      ) : conLugar.length === 0 ? (
        <p className="mt-2 text-sm text-(--kt-ink-soft)">Todas las categorías completaron su cupo.</p>
      ) : (
        <form noValidate onSubmit={handleSubmit((d) => anotar.mutate(d))} className="mt-3 space-y-4">
          <p className="text-sm text-(--kt-ink-soft)">Te anotás con tu nombre de la cuenta. La organización confirma tu inscripción.</p>
          <SelectField label="Categoría" name="categoria_id" register={register} error={errors.categoria_id?.message} placeholder="Elegí"
            options={conLugar.map((c) => ({ value: String(c.id), label: c.nombre }))} />
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-semibold text-(--kt-ink)">Tu compañero</legend>
            {[["nombre", "No tiene cuenta: escribo su nombre"], ["codigo", "Tiene cuenta: lo invito con su código"]].map(([valor, etiqueta]) => (
              <label key={valor} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm has-checked:border-(--kt-petrol) has-checked:bg-(--kt-bg-soft)">
                <input type="radio" value={valor} {...register("modo")} /> {etiqueta}
              </label>
            ))}
          </fieldset>
          {modo === "codigo" ? (
            <InputField label="Código de tu compañero" name="codigo_companiero" placeholder="MP-XXXXX" maxLength={12} autoComplete="off"
              helperText="Lo ve en su perfil. Le llega una invitación y tiene que aceptarla." register={register} error={errors.codigo_companiero?.message} />
          ) : (
            <InputField label="Nombre y apellido de tu compañero" name="jugador2_nombre" placeholder="Ej: Juan Pérez" maxLength={80} register={register} error={errors.jugador2_nombre?.message} />
          )}
          <InputField label="Tu teléfono (opcional)" name="telefono" type="tel" inputMode="tel" placeholder="Para que la organización te avise horarios" maxLength={40} register={register} error={errors.telefono?.message} />
          <InputField label="Nota para la organización (opcional)" name="nota" maxLength={300} register={register} error={errors.nota?.message} />
          {monto > 0 && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Esta categoría cobra <strong>{formatearPesos(monto)}</strong> por pareja. Al anotarte te llevamos a los datos para transferir y a mandar el comprobante.
            </p>
          )}
          {anotar.isError && <ErrorBanner message={mensajeDe(anotar.error, "No pudimos anotarte. Probá de nuevo.")} />}
          <button type="submit" disabled={anotar.isPending} className={`${BOTON} w-full bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover) sm:w-auto`}>
            {anotar.isPending ? "Anotando…" : "Anotarme"}
          </button>
          {anotar.isSuccess && <p role="status" className="text-sm text-emerald-800">Seguí el estado en <Link to="/mis-inscripciones" className="font-semibold underline">Mis inscripciones</Link>.</p>}
        </form>
      )}
    </section>
  );
}
