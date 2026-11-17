import { Image } from "lucide-react";
import GaleriaTab from "./tabs/galeria_tab.jsx";

// Textos, pilares y contacto del home se sacaron de este panel — esa
// información ahora vive en config/home_config.js y config/footer_config.js
// (edición directa del archivo, sin base de datos de por medio, a propósito
// para que haya una sola fuente y no se pueda pisar sin querer desde acá).
// Lo único que sigue siendo admin-editable es la galería de fotos/videos,
// porque eso sí necesita subida de archivos, no tiene sentido a mano.
export default function HomeConfigPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">

        <div className="overflow-hidden rounded-2xl border border-[var(--kt-turquoise-border)] bg-white shadow-sm shadow-[var(--kt-turquoise)]/10">
          <div className="h-1 w-full bg-linear-to-r from-(--kt-teal-700) via-[var(--kt-petrol)] to-[var(--kt-turquoise)]" />
          <div className="px-5 py-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kt-teal-700) px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <Image size={11} />
              Admin
            </span>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Galería del home</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Fotos y videos que se ven en la sección "Así trabajamos" de la página pública.
              Los textos, pilares y datos de contacto se editan directo en el código
              (config/home_config.js y config/footer_config.js), no acá.
            </p>
          </div>
        </div>

        <GaleriaTab />

      </div>
    </div>
  );
}
