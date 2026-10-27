import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

/** Plan vencido: se ve todo pero no se edita (el servidor también lo frena con 402). */
export default function AvisoSoloLectura({ mensaje }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <Lock size={18} aria-hidden="true" className="shrink-0" />
      <p className="min-w-0 flex-1">{mensaje}</p>
      <Link to="/mi-suscripcion" className="inline-flex min-h-11 items-center rounded-xl bg-red-700 px-4 font-bold text-white hover:bg-red-800">Renovar</Link>
    </div>
  );
}
