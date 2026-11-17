import { Suspense, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/auth_context.jsx";
import { usePanelGrupos } from "../../controls/layout/panel/use_panel_grupos.js";
import { pantallasActivas } from "../../../proyecto/pantallas_modulos.jsx";

/** Inicio del panel: el resumen del negocio y un acceso a cada pantalla que el rol permite. */
export default function PanelInicioPage() {
  const { usuario } = useAuth();
  const secciones = usePanelGrupos().filter((grupo) => grupo.titulo);
  const location = useLocation();
  const navigate = useNavigate();
  // PAN-04: el aviso llega en el estado de la navegación y se borra, así aparece una vez por intento.
  const [sinPermiso] = useState(Boolean(location.state?.sinPermiso));
  useEffect(() => {
    if (location.state?.sinPermiso) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      {sinPermiso && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No tenés permiso para ver esa pantalla. Si la necesitás, pedíselo a un administrador.</p>}
      <div>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}</h1>
        <p className="text-sm text-(--kt-ink-soft)">Este es el resumen de tu negocio y todo lo que podés gestionar.</p>
      </div>

      {pantallasActivas.map(({ codigo, ResumenPanel }) => ResumenPanel && (
        <Suspense key={codigo} fallback={null}><ResumenPanel /></Suspense>
      ))}

      <section aria-labelledby="panel-accesos" className="space-y-4">
        <h2 id="panel-accesos" className="text-lg font-bold text-(--kt-ink)">Accesos</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {secciones.map((grupo) => (
            <div key={grupo.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="px-2 text-xs font-semibold tracking-wider text-(--kt-ink-soft) uppercase">{grupo.titulo}</h3>
              <ul className="mt-2 space-y-1">
                {grupo.items.map((item) => {
                  const Icono = item.icon;
                  return (
                    <li key={item.to}>
                      <Link to={item.to} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold text-(--kt-ink) outline-none hover:bg-(--kt-turquoise-soft) focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)">
                        {Icono && <Icono aria-hidden="true" className="h-5 w-5 shrink-0 text-(--kt-teal-700)" />}{item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
