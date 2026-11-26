import { RotateCw } from "lucide-react";
import AdminSpinner from "../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../controls/ui/admin_empty_state.jsx";
import ErrorBanner from "../../controls/ui/error_banner.jsx";
import { mensajeError } from "./errores.js";
import { BOTON_SECUNDARIO } from "./estilos.js";

export function Pantalla({ children }) {
  return <div className="min-h-screen bg-slate-50 px-4 py-6 sm:p-8"><div className="mx-auto max-w-5xl space-y-4">{children}</div></div>;
}

export function Encabezado({ titulo, descripcion, children }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-slate-600">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Tarjeta({ titulo, children, accion }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      {titulo && <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">{titulo}</h2>{accion}</div>}
      {children}
    </section>
  );
}

/** Cargando, error con reintentar o vacío; si hay datos, muestra `children`. */
export function SegunConsulta({ consulta, vacia, icono, tituloVacio, descripcionVacio, accionVacio, children }) {
  if (consulta.isPending) return <AdminSpinner />;
  if (consulta.isError) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={mensajeError(consulta.error, "No se pudo cargar. Revisá la conexión.")} />
        <button type="button" onClick={() => consulta.refetch()} className={BOTON_SECUNDARIO}><RotateCw size={16} aria-hidden="true" /> Reintentar</button>
      </div>
    );
  }
  if (vacia) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white"><AdminEmptyState icon={icono} title={tituloVacio} description={descripcionVacio} action={accionVacio} /></div>;
  }
  return children();
}

/** Casilla con su texto, conectada a React Hook Form. */
export function Casilla({ name, register, label, ayuda }) {
  return (
    <label className="flex min-h-11 items-start gap-3 py-2">
      <input type="checkbox" {...register(name)} className="mt-0.5 h-5 w-5 accent-(--kt-teal-700)" />
      <span><span className="block font-semibold text-slate-800">{label}</span>{ayuda && <span className="block text-sm text-slate-600">{ayuda}</span>}</span>
    </label>
  );
}
