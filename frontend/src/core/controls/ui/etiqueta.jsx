// Tonos por significado, no por color: así un estilo nuevo cambia el color sin tocar las pantallas.
const TONOS = {
  neutro: "bg-slate-100 text-slate-700",
  info: "bg-sky-100 text-sky-900",
  exito: "bg-emerald-100 text-emerald-800",
  aviso: "bg-amber-100 text-amber-900",
  peligro: "bg-rose-100 text-rose-800",
  destacado: "bg-violet-100 text-violet-900",
};

/** Una etiqueta de estado ("Recibido", "Agotado", "Oculto"). `tono`: neutro, info, exito, aviso, peligro o destacado. */
export default function Etiqueta({ tono = "neutro", grande = false, children }) {
  return <span className={`inline-flex w-fit items-center rounded-full font-bold ${grande ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"} ${TONOS[tono]}`}>{children}</span>;
}
