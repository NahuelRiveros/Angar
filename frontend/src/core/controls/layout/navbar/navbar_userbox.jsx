import { useState, useRef, useEffect } from "react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/auth_context.jsx";
import { authConfig } from "../../../config/auth_config.js";
import { UI_NAVBAR as S } from "./navbar_style.js";
import NavbarLink from "./navbar_link.jsx";
export default function NavbarUserBox({ mobile = false, onLogout, links = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const trigger = useRef(null);
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  useEffect(() => {
    if (!open) return;
    const closeOutside = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const escape = (e) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (!usuario) return null;
  const nombre = [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.email;
  const cerrar = () => { setOpen(false); onLogout?.(); };
  const content = <>
    <p className="truncate border-b border-(--kt-border) p-3 text-sm font-semibold">{nombre}</p>
    <div className="space-y-1 p-2">{links.map((item) => <NavbarLink key={item.to} item={item} onNavigate={cerrar} base={S.item_link} active={S.item_link_activo} inactive={S.item_link_inactivo} />)}</div>
    <button type="button" className="flex min-h-11 w-full items-center gap-2 border-t border-(--kt-border) px-4 text-sm font-semibold text-rose-700"
      onClick={async () => { await logout(); cerrar(); navigate(authConfig.logoutDestination); }}><LogOut size={16} />Cerrar sesión</button>
  </>;
  if (mobile) return <div className="overflow-hidden rounded-xl border border-(--kt-border)">{content}</div>;
  return <div ref={ref} className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen((v) => !v)}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-(--kt-border) bg-white px-3 text-sm font-semibold"><User size={18} /><span>Mi cuenta</span><ChevronDown size={14} /></button>
    {open && <div id="account-menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-(--kt-border) bg-white shadow-xl">{content}</div>}
  </div>;
}
