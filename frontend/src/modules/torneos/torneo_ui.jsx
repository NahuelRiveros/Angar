import { ESTADOS_TORNEO } from "../../../../torneo_config.js";

const COLORES = {
  borrador: "bg-slate-100 text-slate-700 ring-slate-200",
  inscripcion: "bg-sky-50 text-sky-800 ring-sky-200",
  en_juego: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  finalizado: "bg-violet-50 text-violet-800 ring-violet-200",
  cancelado: "bg-red-50 text-red-800 ring-red-200",
};

export function EstadoTorneo({ estado }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${COLORES[estado] ?? COLORES.borrador}`}>
      {ESTADOS_TORNEO[estado]?.etiqueta ?? estado}
    </span>
  );
}
