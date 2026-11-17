import { ICONOS_HOME, ICONOS_HOME_NOMBRES } from "../home/home_iconos.js";

/** Selector visual de ícono (no un <select> de texto) — usado por Pilares y Contacto del home. */
export default function IconoPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
      {ICONOS_HOME_NOMBRES.map((nombre) => {
        const Icon = ICONOS_HOME[nombre];
        const activo = value === nombre;
        return (
          <button
            key={nombre}
            type="button"
            title={nombre}
            onClick={() => onChange(nombre)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
              activo ? "border-(--kt-teal-700) bg-(--kt-teal-700) text-white" : "border-transparent bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
