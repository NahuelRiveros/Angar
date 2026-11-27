// Clases del kit para botones y campos (ficha: docs/specs/core/componentes.md). Para un <Link> o <a>
// con forma de botón; para un <button>, usar <ActionButton variante="…">. Los colores salen del tema
// del proyecto (--kt-*): un estilo nuevo cambia esas variables, no estas clases.
// Base, tamaño y variante no repiten propiedades: así no compiten clases de Tailwind entre sí.
const BASE = "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const TAMANOS = {
  normal: "min-h-11 px-4 py-2.5 text-sm",
  grande: "min-h-12 px-6 py-3 text-base",
};
const VARIANTES = {
  principal: "bg-(--kt-teal-700) text-white hover:bg-(--kt-petrol)",
  secundario: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  peligro: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  compra: "bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover)",
  whatsapp: "bg-[#0B7A3E] text-white hover:bg-[#086132]",
};

/** `variante`: principal, secundario, peligro, compra o whatsapp. `tamano`: normal o grande. */
export const claseBoton = (variante = "principal", tamano = "normal") => `${BASE} ${TAMANOS[tamano]} ${VARIANTES[variante]}`;

export const BOTON_PRIMARIO = claseBoton("principal");
export const BOTON_SECUNDARIO = claseBoton("secundario");
export const BOTON_PELIGRO = claseBoton("peligro");
export const BOTON_COMPRA = claseBoton("compra", "grande");
export const BOTON_WHATSAPP = claseBoton("whatsapp", "grande");

/** Para un <select> o <input> sueltos; en un formulario, mejor InputField / SelectField. */
export const CAMPO = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-(--kt-teal-700) focus:ring-2 focus:ring-black/10";
