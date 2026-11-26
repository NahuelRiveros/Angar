import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/auth_context.jsx";
import { cn } from "../../../utils/cn.js";
import { nombreCompleto, iniciales, rolVisible } from "../../../auth/datos_usuario.js";

/** Quién está usando el panel y el botón para salir. `compacta`: menú achicado. */
export default function PanelUsuario({ compacta = false }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  if (!usuario) return null;

  const nombre = nombreCompleto(usuario);
  const rol = rolVisible(usuario);

  async function salir() {
    await logout();
    navigate("/login");
  }

  return (
    <div className={cn("flex items-center gap-3", compacta && "flex-col gap-2")}>
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--kt-turquoise) text-sm font-bold text-(--kt-night)">
        {iniciales(nombre)}
      </span>
      <div className={cn("min-w-0 flex-1", compacta && "sr-only")}>
        <p className="truncate text-sm font-semibold text-white">{nombre}</p>
        {rol && <p className="truncate text-xs text-slate-400">{rol}</p>}
      </div>
      <button
        type="button" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)"
      >
        <LogOut aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
