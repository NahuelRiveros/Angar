import { Link } from "react-router-dom";
import { useAuth } from "../../auth/auth_context.jsx";
import { tienePermiso } from "../../../../permisos_config.js";
import ResumenSuscripciones from "../suscripcion/admin/resumen_suscripciones.jsx";
import RegistradosResumen from "../usuarios/admin/registrados_resumen.jsx";
import DemoTorneosTarjeta from "./demo_torneos_tarjeta.jsx";
import { usePanelGrupos } from "../../controls/layout/panel/use_panel_grupos.js";

/** Inicio del panel: un acceso a cada pantalla que el rol permite. */
export default function PanelInicioPage() {
  const { usuario } = useAuth();
  const secciones = usePanelGrupos().filter((grupo) => grupo.titulo);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}</h1>
        <p className="text-sm text-(--kt-ink-soft)">Esto es todo lo que podés gestionar.</p>
      </div>

      {tienePermiso(usuario, "suscripciones.ver") && <ResumenSuscripciones />}
      {/* Cantidad y nombres de los usuarios: solo el super admin (el servidor también lo exige). */}
      {usuario?.roles?.includes("super_admin") && <RegistradosResumen />}
      {usuario?.roles?.includes("super_admin") && <DemoTorneosTarjeta />}

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
