import { useEffect, useState } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../auth/auth_context.jsx";
import { authLink } from "../../acceso/return_to.js";
import { filtrarNavbarPorRol } from "./navbar_permissions.js";
import { navbar_config } from "../../../config/navbar_config/main.js";
import NavbarDesktop from "./navbar_desktop.jsx";
import NavbarMobile from "./navbar_mobile.jsx";
import NavbarUserBox from "./navbar_userbox.jsx";
import { UI_NAVBAR as S } from "./navbar_style.js";
import LogoMarca from "../../brand/logo_marca.jsx";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  const returnTo = location.pathname + location.search + location.hash;
  const config = filtrarNavbarPorRol(navbar_config, usuario);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const close = () => { if (media.matches) setMobileOpen(false); };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:p-3">Saltar al contenido</a>
    <header className={S.barra_header}>
      <div className={S.barra_linea_acento} aria-hidden="true" />
      <nav aria-label="Navegación principal" className={S.barra_nav_container}>
        <Link to={config.brand.linkTo} className={S.brand_link} aria-label={config.brand.titulo}>
          {config.brand.logoUrl ? <img src={config.brand.logoUrl} alt={config.brand.titulo} className="h-10 max-w-36 object-contain" /> : <LogoMarca size="sm" />}
        </Link>
        <NavbarDesktop config={config} />
        <div className="flex shrink-0 items-center gap-2">
          {config.extras?.map((Extra, i) => <Extra key={i} />)}
          <div className="hidden lg:block">
            {cargando ? <span className="text-sm text-slate-500">Ingresando…</span> : usuario
              ? <NavbarUserBox links={config.accountLinks} />
              : <Link to={authLink("/login", returnTo)} className={S.btn_login_desktop}>Ingresar <ArrowUpRight size={17} aria-hidden="true" /></Link>}
          </div>
          {!cargando && !usuario && <Link to={authLink("/login", returnTo)} className="hidden min-h-11 items-center px-2 text-xs font-bold text-(--kt-night) min-[380px]:inline-flex lg:hidden">Ingresar</Link>}
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" aria-expanded={mobileOpen}
            className={S.btn_hamburguesa + " lg:hidden"}><Menu size={21} aria-hidden="true" /><span className="hidden sm:inline">Menú</span></button>
        </div>
      </nav>
    </header>
    {mobileOpen && <NavbarMobile config={config} open onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} returnTo={returnTo} />}
  </>;
}
