import { useQuery } from "@tanstack/react-query";
import {
  CreditCard, CheckCircle2, AlertTriangle, Clock,
  Lock, RefreshCw, Zap, CalendarDays, BadgeCheck,
  MessageCircle, Copy, Check,
} from "lucide-react";
import { useState } from "react";
import { getEstadoSuscripcion } from "../../../api/suscripcion_api";
import { formatearFechaAR } from "../../../utils/formatear_fecha";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function fmtFecha(val) {
  if (!val) return "—";
  return formatearFechaAR(String(val).slice(0, 10)) || "—";
}

function money(v) {
  return Number(v || 0).toLocaleString("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  });
}

// Número de WhatsApp de Nahuel (soporte)
const WA_SOPORTE = "543704081082";

const ESTADO_UI = {
  activo: {
    bg:    "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon:  <CheckCircle2 size={14} />,
    label: "Activo",
  },
  aviso: {
    bg:    "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon:  <AlertTriangle size={14} />,
    label: "Por vencer",
  },
  gracia: {
    bg:    "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    icon:  <Clock size={14} />,
    label: "Período de gracia",
  },
  vencido: {
    bg:    "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700 border-red-200",
    icon:  <Lock size={14} />,
    label: "Vencido",
  },
  sin_suscripcion: {
    bg:    "bg-slate-50 border-slate-200",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon:  <AlertTriangle size={14} />,
    label: "Sin configurar",
  },
};

/* ── página ──────────────────────────────────────────────────────────────── */

export default function SuscripcionPage() {
  const [copiado, setCopiado] = useState(false);

  const { data: estado, isLoading, refetch } = useQuery({
    queryKey:  ["suscripcion-estado"],
    queryFn:   getEstadoSuscripcion,
    staleTime: 60_000,
  });

  const ui        = ESTADO_UI[estado?.estado || "sin_suscripcion"] ?? ESTADO_UI.sin_suscripcion;
  const necesita  = ["aviso", "gracia", "vencido"].includes(estado?.estado);

  // Mensaje pre-armado para WhatsApp
  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const waTexto   = encodeURIComponent(
    `Hola Nahuel! 👋 Te mando el comprobante del pago mensual del sistema.\n\n` +
    `🏋️ Gimnasio: ${estado?.cliente_nombre || ""}\n` +
    `📋 Plan: ${estado?.plan_nombre || "Plan Mensual"}\n` +
    `💰 Monto: ${money(estado?.precio)}\n` +
    `📅 Período: ${mesActual}\n\n` +
    `Adjunto el comprobante de transferencia.`
  );
  const waUrl = `https://wa.me/${WA_SOPORTE}?text=${waTexto}`;

  function copiarMonto() {
    navigator.clipboard.writeText(String(estado?.precio || ""));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-xl space-y-4">

        {/* ── ENCABEZADO ── */}
        <div className="overflow-hidden rounded-2xl border border-[var(--kt-turquoise-border)] bg-white shadow-sm shadow-[var(--kt-turquoise)]/10">
          <div className="h-1 w-full bg-linear-to-r from-(--kt-teal-700) via-[var(--kt-petrol)] to-[var(--kt-turquoise)]" />
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--kt-teal-700) shadow-sm shadow-[var(--kt-turquoise)]/25">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">Suscripción al Software</h1>
                <p className="text-xs text-(--kt-ink-mute)">Moovs — Plan mensual</p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>

        {/* ── ESTADO DEL PLAN ── */}
        {isLoading ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-(--kt-ink-mute) text-sm">
            Cargando…
          </div>
        ) : (
          <div className={`rounded-2xl border p-5 space-y-4 ${ui.bg}`}>

            {/* Badge + nombre plan */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${ui.badge}`}>
                {ui.icon} {ui.label}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {estado?.plan_nombre || "Plan Mensual"}
              </span>
            </div>

            {/* Mensaje de estado */}
            {estado?.mensaje && (
              <p className="text-sm font-medium text-slate-700">{estado.mensaje}</p>
            )}

            {/* Datos del plan */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-(--kt-ink-mute) flex items-center gap-1 mb-0.5">
                  <CalendarDays size={9} /> Vencimiento
                </p>
                <p className="text-sm font-extrabold text-slate-800">
                  {fmtFecha(estado?.fecha_vencimiento)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-(--kt-ink-mute) flex items-center gap-1 mb-0.5">
                  <Zap size={9} /> Precio mensual
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-extrabold text-slate-800">{money(estado?.precio)}</p>
                  {estado?.precio > 0 && (
                    <button onClick={copiarMonto} title="Copiar monto"
                      className="text-slate-500 hover:text-(--kt-teal-700) transition">
                      {copiado ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-(--kt-ink-mute) flex items-center gap-1 mb-0.5">
                  <BadgeCheck size={9} /> Cliente
                </p>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {estado?.cliente_nombre || "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── CÓMO PAGAR ── */}
        {!isLoading && estado?.ok && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-700">¿Cómo renovar el plan?</h2>

            <div className="space-y-3">
              {/* Paso 1 */}
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--kt-teal-700) text-[11px] font-extrabold text-white">1</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Realizá la transferencia</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transferí <span className="font-bold text-(--kt-teal-700)">{money(estado?.precio)}</span> al alias{" "}
                    <span className="font-bold text-slate-700 tracking-wide">Maloki03</span>.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--kt-teal-700) text-[11px] font-extrabold text-white">2</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Enviá el comprobante por WhatsApp</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    El mensaje ya viene armado con los datos del plan. Solo adjuntá la captura del pago.
                  </p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--kt-teal-700) text-[11px] font-extrabold text-white">3</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Nahuel extiende el plan manualmente</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirmado el comprobante, el plan se extiende desde el módulo de administración.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón WhatsApp */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3.5 font-bold text-white shadow-md shadow-green-500/20 hover:bg-[#20bf5b] active:scale-95 transition"
            >
              <MessageCircle size={18} />
              Enviar comprobante por WhatsApp
            </a>

            {necesita && (
              <p className="text-center text-[11px] text-(--kt-ink-mute)">
                ⏳ El sistema se activa dentro de las 24 hs hábiles de confirmado el pago
              </p>
            )}
          </div>
        )}

        {/* ── CICLO DE FACTURACIÓN ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-(--kt-ink-mute) mb-3">
            Ciclo de facturación
          </h3>
          <div className="space-y-2">
            {[
              { color: "bg-emerald-400", text: "Activo — más de 10 días antes del vencimiento" },
              { color: "bg-yellow-400",  text: "Aviso — últimos 10 días, renovar pronto" },
              { color: "bg-orange-400",  text: "Gracia — del 1 al 10 del mes siguiente" },
              { color: "bg-red-400",     text: "Vencido — sistema bloqueado tras los 10 días de gracia" },
            ].map(({ color, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-slate-600">
                <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
                {text}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
