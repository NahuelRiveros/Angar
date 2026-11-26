// Botones del panel y de la web de los módulos opcionales. Los colores salen del tema del proyecto.
const BASE = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:outline-none disabled:opacity-60";
export const BOTON_PRIMARIO = `${BASE} bg-(--kt-teal-700) text-white hover:bg-(--kt-teal-900)`;
export const BOTON_SECUNDARIO = `${BASE} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const BOTON_PELIGRO = `${BASE} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`;
export const BOTON_COMPRA = `${BASE} min-h-12 px-6 text-base bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover)`;
export const BOTON_WHATSAPP = `${BASE} min-h-12 px-6 text-base bg-[#0B7A3E] text-white hover:bg-[#086132]`;
export const CAMPO = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-(--kt-teal-700) focus:ring-2 focus:ring-black/10";
