import { useEffect, useState } from "react";
import {
  Shield, RefreshCw, Clock, CalendarCheck, AlertTriangle,
  CheckCircle, Calendar, Plus,
} from "lucide-react";
import {
  getSuperEstadoSuscripcion,
  superExtenderSuscripcion,
  superFijarFechaSuscripcion,
} from "../../../api/suscripcion_api.js";
import InputField from "../../../controls/ui/input_field.jsx";

const OPCIONES_DIAS = [
  { label: "30 días", dias: 30 },
  { label: "60 días", dias: 60 },
  { label: "90 días", dias: 90 },
  { label: "6 meses", dias: 180 },
  { label: "1 año",   dias: 365 },
];

function calcularNuevoVencimientoExtender(fechaVenc, dias) {
  const hoy  = new Date();
  hoy.setHours(0, 0, 0, 0);
  const base = new Date(fechaVenc);
  base.setHours(0, 0, 0, 0);
  const desde = base > hoy ? base : hoy;
  const calculada = new Date(desde);
  calculada.setDate(calculada.getDate() + dias);
  // Redondea al 1ro del mes siguiente (igual que el backend)
  return new Date(calculada.getFullYear(), calculada.getMonth() + 1, 1);
}

function fmtFecha(f) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-AR", {
    year: "numeric", month: "long", day: "numeric", timeZone: "America/Argentina/Cordoba",
  });
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function GestionSuscripcionPage() {
  const [estado, setEstado]       = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState("");
  const [exito, setExito]         = useState("");

  // Modo: "extender" | "fijar"
  const [modo, setModo] = useState("extender");

  // Extender
  const [diasSel, setDiasSel]       = useState(30);
  const [diasCustom, setDiasCustom] = useState("");
  const [extendiendo, setExtendiendo] = useState(false);

  // Fijar fecha
  const [fechaFijar, setFechaFijar] = useState("");
  const [fijando, setFijando]       = useState(false);

  const diasEfectivos = diasCustom !== "" ? Number(diasCustom) : diasSel;

  async function cargarEstado() {
    try {
      setCargando(true);
      setError("");
      const r = await getSuperEstadoSuscripcion();
      setEstado(r);
    } catch (e) {
      setError(e?.response?.data?.mensaje || "No se pudo obtener el estado de suscripción");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarEstado(); }, []);

  async function handleExtender() {
    if (!diasEfectivos || diasEfectivos <= 0 || diasEfectivos > 3650) {
      setError("Ingresá un número de días entre 1 y 3650");
      return;
    }
    const previewFecha = estado?.fecha_vencimiento
      ? fmtFecha(calcularNuevoVencimientoExtender(estado.fecha_vencimiento, diasEfectivos))
      : "—";
    if (!window.confirm(`¿Extender ${diasEfectivos} días? Nuevo vencimiento estimado: ${previewFecha}`)) return;
    try {
      setExtendiendo(true);
      setExito(""); setError("");
      const r = await superExtenderSuscripcion(diasEfectivos);
      setExito(`Suscripción extendida. Nuevo vencimiento: ${fmtFecha(r.nuevo_vencimiento)}`);
      setDiasCustom("");
      await cargarEstado();
    } catch (e) {
      setError(e?.response?.data?.mensaje || "Error al extender la suscripción");
    } finally {
      setExtendiendo(false);
    }
  }

  async function handleFijar() {
    if (!fechaFijar) { setError("Seleccioná una fecha"); return; }
    if (!window.confirm(`¿Fijar el vencimiento exactamente al ${fmtFecha(fechaFijar)}?`)) return;
    try {
      setFijando(true);
      setExito(""); setError("");
      const r = await superFijarFechaSuscripcion(fechaFijar);
      setExito(`Vencimiento fijado al ${fmtFecha(r.nuevo_vencimiento)}`);
      setFechaFijar("");
      await cargarEstado();
    } catch (e) {
      setError(e?.response?.data?.mensaje || "Error al fijar la fecha");
    } finally {
      setFijando(false);
    }
  }

  const diasRestantes = estado?.dias_restantes ?? null;
  const vencida       = estado?.bloqueado === true;
  const alertaDias    = diasRestantes !== null && diasRestantes <= 14 && !vencida;

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">

        {/* ── ENCABEZADO ── */}
        <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-500/10">
          <div className="h-1 w-full bg-linear-to-r from-violet-600 via-violet-500 to-purple-400" />
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm shadow-violet-500/30">
                <Shield size={11} />
                Administrador del sistema
              </span>
              <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Suscripción del sistema</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Gestioná la vigencia del plan de Moovs como software.
              </p>
            </div>
            <button
              type="button"
              onClick={cargarEstado}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw size={13} className={cargando ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── ALERTAS ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} className="shrink-0" />
            {error}
          </div>
        )}
        {exito && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle size={15} className="shrink-0" />
            {exito}
          </div>
        )}

        {/* ── ESTADO ACTUAL ── */}
        {cargando ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-sm">
            Cargando estado…
          </div>
        ) : estado ? (
          <>
            {(alertaDias || vencida) && (
              <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                vencida
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div className="text-sm font-medium">
                  {vencida
                    ? "La suscripción está VENCIDA."
                    : `Quedan solo ${diasRestantes} día(s) para el vencimiento.`}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoCard
                icono={<CalendarCheck size={16} className="text-violet-600" />}
                titulo="Vencimiento"
                valor={fmtFecha(estado.fecha_vencimiento)}
              />
              <InfoCard
                icono={<Clock size={16} className={diasRestantes <= 14 ? "text-red-500" : "text-emerald-500"} />}
                titulo="Días restantes"
                valor={diasRestantes !== null ? `${diasRestantes} días` : "—"}
                destacar={diasRestantes !== null && diasRestantes <= 14}
              />
              <InfoCard
                icono={
                  vencida
                    ? <AlertTriangle size={16} className="text-red-500" />
                    : <CheckCircle size={16} className="text-emerald-500" />
                }
                titulo="Estado"
                valor={
                  estado.estado === "activo"  ? "Activo"  :
                  estado.estado === "aviso"   ? "Por vencer" :
                  estado.estado === "gracia"  ? "En gracia" :
                  estado.estado === "vencido" ? "Vencido" : (estado.estado ?? "—")
                }
                verde={!vencida}
                rojo={vencida}
              />
            </div>

            {estado.cliente_nombre && (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm text-slate-600 shadow-sm">
                <span className="font-semibold text-slate-800">Cliente: </span>
                {estado.cliente_nombre}
                {estado.precio ? ` · $${Number(estado.precio).toLocaleString("es-AR")} / renovación` : ""}
              </div>
            )}

            {/* ── PANEL DE RENOVACIÓN ── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Tabs modo */}
              <div className="flex border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => { setModo("extender"); setError(""); setExito(""); }}
                  className={[
                    "flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition",
                    modo === "extender"
                      ? "border-b-2 border-violet-600 text-violet-700 bg-violet-50/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Plus size={13} />
                  Extender días
                </button>
                <button
                  type="button"
                  onClick={() => { setModo("fijar"); setError(""); setExito(""); }}
                  className={[
                    "flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition",
                    modo === "fijar"
                      ? "border-b-2 border-violet-600 text-violet-700 bg-violet-50/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Calendar size={13} />
                  Fecha exacta
                </button>
              </div>

              {/* ── MODO EXTENDER ── */}
              {modo === "extender" && (
                <div className="px-5 py-4 space-y-4">
                  <p className="text-xs text-slate-500">
                    Los días se suman al vencimiento actual (o a hoy si ya venció).
                    El sistema redondea al 1.° del mes siguiente.
                  </p>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-2">
                    {OPCIONES_DIAS.map(({ label, dias }) => (
                      <button
                        key={dias}
                        type="button"
                        onClick={() => { setDiasSel(dias); setDiasCustom(""); }}
                        className={[
                          "rounded-xl px-4 py-2 text-sm font-bold transition",
                          diasCustom === "" && diasSel === dias
                            ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Custom días */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-600 shrink-0">Otro:</label>
                    <InputField
                      hideLabel
                      hideMessage
                      fullWidth={false}
                      wrapperClassName="w-28"
                      type="number"
                      min={1}
                      max={3650}
                      placeholder="ej. 45"
                      value={diasCustom}
                      onChange={(e) => setDiasCustom(e.target.value)}
                      className="text-sm font-semibold text-slate-800"
                    />
                    <span className="text-sm text-slate-400">días</span>
                  </div>

                  {/* Preview */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
                    Nuevo vencimiento estimado:{" "}
                    <span className="font-bold text-slate-800">
                      {estado.fecha_vencimiento && diasEfectivos > 0
                        ? fmtFecha(calcularNuevoVencimientoExtender(estado.fecha_vencimiento, diasEfectivos))
                        : "—"}
                    </span>
                    {diasEfectivos > 0 && (
                      <span className="ml-2 text-violet-500 font-semibold">
                        (+{diasEfectivos} días)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleExtender}
                    disabled={extendiendo || !diasEfectivos || diasEfectivos <= 0}
                    className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-violet-500/20 hover:bg-violet-500 transition disabled:opacity-60"
                  >
                    {extendiendo ? "Extendiendo…" : `Extender ${diasEfectivos > 0 ? diasEfectivos : "?"} días`}
                  </button>
                </div>
              )}

              {/* ── MODO FIJAR FECHA ── */}
              {modo === "fijar" && (
                <div className="px-5 py-4 space-y-4">
                  <p className="text-xs text-slate-500">
                    Fijá exactamente el día que vence la suscripción, sin redondeo.
                  </p>

                  <InputField
                    label="Fecha de vencimiento"
                    hideMessage
                    type="date"
                    min={hoyISO()}
                    value={fechaFijar}
                    onChange={(e) => setFechaFijar(e.target.value)}
                  />

                  {fechaFijar && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
                      Vencimiento exacto:{" "}
                      <span className="font-bold text-slate-800">
                        {fmtFecha(fechaFijar)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleFijar}
                    disabled={fijando || !fechaFijar}
                    className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-violet-500/20 hover:bg-violet-500 transition disabled:opacity-60"
                  >
                    {fijando ? "Fijando…" : "Fijar fecha"}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}

function InfoCard({ icono, titulo, valor, destacar, verde, rojo }) {
  return (
    <div className={`rounded-2xl border px-4 py-3.5 shadow-sm bg-white ${
      rojo ? "border-red-200" : verde ? "border-emerald-200" : destacar ? "border-amber-200" : "border-slate-200"
    }`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {icono}
        {titulo}
      </div>
      <p className={`mt-1.5 text-lg font-extrabold leading-tight ${
        rojo ? "text-red-600" : verde ? "text-emerald-700" : destacar ? "text-amber-700" : "text-slate-900"
      }`}>
        {valor}
      </p>
    </div>
  );
}
