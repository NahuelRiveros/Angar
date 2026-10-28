import { useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/auth_context.jsx";
import { authConfig } from "../../../config/auth_config.js";
import { authLink } from "../../acceso/return_to.js";
import Modal from "../../ui/modal.jsx";
import LogoMarca from "../../brand/logo_marca.jsx";
import NavbarUserBox from "./navbar_userbox.jsx";
import NavbarLink from "./navbar_link.jsx";
import { UI_NAVBAR as S } from "./navbar_style.js";

function Items({ items, onNavigate }) {
  return items.map((item) => item.children?.length
    ? <div key={item.label}><p className="px-3 py-2 text-xs font-bold text-slate-500">{item.label}</p><Items items={item.children} onNavigate={onNavigate} /></div>
    : <NavbarLink key={item.to} item={item} onNavigate={onNavigate} base={S.mobile_link} active={S.mobile_link_activo} inactive={S.mobile_link_inactivo} />);
}

export default function NavbarMobile({ config, open, onNavigate, onClose, returnTo }) {
  const [groups, setGroups] = useState({});
  const { usuario, cargando } = useAuth();
  return <Modal open={open} onClose={onClose} title={<><span className="sr-only">Menú de navegación</span><span aria-hidden="true"><LogoMarca size="sm" /></span></>}
    className="!m-0 !ml-auto !h-dvh !max-h-dvh !w-[min(100vw,25rem)] !rounded-none !border-0 !bg-(--kt-bg-soft) sm:!rounded-l-3xl">
    <nav aria-label="Navegación móvil" className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-6 pb-[env(safe-area-inset-bottom)]">
      <div>
        <p className="mb-4 px-3 pt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-(--kt-ink-soft)">Tu próximo partido empieza acá</p>
        <div className="space-y-2"><Items items={config.links ?? []} onNavigate={onNavigate} /></div>
      </div>
      {config.dropdowns?.map((group) => <div key={group.id} className="rounded-2xl border border-(--kt-border) bg-white">
        <button type="button" aria-expanded={!!groups[group.id]} aria-controls={`mobile-${group.id}`}
          onClick={() => setGroups((p) => ({ ...p, [group.id]: !p[group.id] }))}
          className="flex min-h-14 w-full items-center justify-between gap-2 px-4 text-left text-sm font-bold">{group.label}<ChevronDown size={16} className={groups[group.id] ? "rotate-180" : ""} /></button>
        {groups[group.id] && <div id={`mobile-${group.id}`} className="space-y-1 p-2"><Items items={group.items} onNavigate={onNavigate} /></div>}
      </div>)}
      <div className="mt-auto border-t border-(--kt-border) pt-5">
        {cargando ? <p className="text-sm text-(--kt-ink-soft)">Ingresando…</p> : usuario
          ? <NavbarUserBox mobile links={config.accountLinks} onLogout={onNavigate} />
          : <div className="grid gap-3 rounded-2xl bg-white p-4">
            <p className="kt-display text-lg font-bold">Nos vemos en la cancha.</p>
            <p className="mb-1 text-xs leading-relaxed text-(--kt-ink-soft)">Entrá a tu cuenta y viví tu próximo torneo.</p>
            <Link to={authLink("/login", returnTo)} onClick={onNavigate} className={S.mobile_btn_login}>Ingresar <ArrowUpRight size={17} aria-hidden="true" /></Link>
            {authConfig.publicRegistration && <Link to={authLink("/register", returnTo)} onClick={onNavigate} className="flex min-h-12 items-center justify-center rounded-xl border border-(--kt-border) text-sm font-bold transition hover:bg-(--kt-bg-soft)">Crear cuenta</Link>}
          </div>}
        <p className="pt-5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-(--kt-ink-soft)">Pádel. Comunidad. Competencia.</p>
      </div>
    </nav>
  </Modal>;
}
