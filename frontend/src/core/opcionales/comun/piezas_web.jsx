import { RotateCw } from "lucide-react";
import { mensajeError } from "./errores.js";
import { BOTON_SECUNDARIO } from "./estilos.js";

export function Cargando({ texto = "Cargando", className = "h-96" }) {
  return <div role="status" aria-label={texto} className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export function ErrorReintentar({ consulta, mensaje }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-900">{mensajeError(consulta.error, mensaje)}</p>
      <button type="button" onClick={() => consulta.refetch()} className={`${BOTON_SECUNDARIO} mt-4`}><RotateCw size={18} aria-hidden="true" /> Reintentar</button>
    </div>
  );
}
