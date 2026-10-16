import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeftOpen, Store, X } from "lucide-react";
import LogoMoovs from "../../brand/logo_moovs.jsx";
import SuscripcionBanner from "../../suscripcion/suscripcion_banner.jsx";
import ErrorBoundary from "../../ui/error_boundary.jsx";
import { cn } from "../../../utils/cn.js";
import PanelMenu from "./panel_menu.jsx";
import PanelUsuario from "./panel_usuario.jsx";
import { usePanelGrupos } from "./use_panel_grupos.js";

const CLAVE_ACHICADO = "panel_menu_achicado";

function leerAchicado() {
  try { return localStorage.getItem(CLAVE_ACHICADO) === "1"; } catch { return false; }
}

const BOTON_ICONO = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition outline-none focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)";

/**
 * Zona de gestión, separada de la tienda: sin navbar ni footer de la tienda, con menú
 * lateral propio (en celular, un menú que se abre con ☰). Las páginas de gestión
 * conservan sus direcciones; solo cambia el marco que las rodea.
 */
export default function PanelLayout({ children }) {
  const grupos = usePanelGrupos();
  const { pathname } = useLocation();
  const [achicado, setAchicado] = useState(leerAchicado);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const items = grupos.flatMap((grupo) => grupo.items.map((item) => ({ ...item, grupo: grupo.titulo })));
  const actual = items.find((item) => (item.exact ? pathname === item.to : pathname.startsWith(item.to)));

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const cerrarConEscape = (e) => { if (e.key === "Escape") setMenuAbierto(false); };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [menuAbierto]);

  function alternarAchicado() {
    setAchicado((antes) => {
      try { localStorage.setItem(CLAVE_ACHICADO, antes ? "0" : "1"); } catch { /* Sin almacenamiento: igual se achica, solo no se recuerda. */ }
      return !antes;
    });
  }

  const Alternar = achicado ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="min-h-screen bg-(--kt-bg-soft) print:bg-white">
      <a href="#panel-contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Saltar al contenido</a>

      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col bg-(--kt-night) transition-[width] duration-200 lg:flex print:hidden", achicado ? "w-18" : "w-64")}>
        <div className={cn("flex h-16 shrink-0 items-center gap-2 px-4", achicado ? "justify-center" : "justify-between")}>
          {!achicado && <Link to="/panel" aria-label="Panel de gestión, inicio" className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)"><LogoMoovs size="sm" variant="light" /></Link>}
          <button type="button" onClick={alternarAchicado} aria-label={achicado ? "Agrandar menú" : "Achicar menú"} title={achicado ? "Agrandar menú" : "Achicar menú"} className={cn(BOTON_ICONO, "text-slate-400 hover:bg-white/10 hover:text-white")}>
            <Alternar aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <PanelMenu grupos={grupos} achicado={achicado} />
        <div className="shrink-0 border-t border-white/10 p-3"><PanelUsuario compacta={achicado} /></div>
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <aside role="dialog" aria-modal="true" aria-label="Menú del panel" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-(--kt-night)">
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
              <LogoMoovs size="sm" variant="light" />
              <button type="button" autoFocus onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" className={cn(BOTON_ICONO, "text-slate-300 hover:bg-white/10 hover:text-white")}>
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <PanelMenu grupos={grupos} onNavegar={() => setMenuAbierto(false)} />
            <div className="shrink-0 border-t border-white/10 p-3"><PanelUsuario /></div>
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200 print:pl-0! print:transition-none", achicado ? "lg:pl-18" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-(--kt-border) bg-white px-4 sm:px-6 print:hidden">
          <button type="button" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú del panel" aria-expanded={menuAbierto} className={cn(BOTON_ICONO, "text-slate-600 hover:bg-slate-100 lg:hidden")}>
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            {actual?.grupo && <p className="truncate text-xs font-semibold text-(--kt-ink-soft) uppercase">{actual.grupo}</p>}
            <p className="truncate font-bold text-(--kt-ink)">{actual?.label ?? "Panel de gestión"}</p>
          </div>
          <Link to="/" className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-(--kt-teal-700) hover:bg-slate-100">
            <Store aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Ver tienda</span><span className="sr-only sm:hidden">Ver tienda</span>
          </Link>
        </header>
        <div className="print:hidden"><SuscripcionBanner /></div>
        <main id="panel-contenido" tabIndex={-1}>
          <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
