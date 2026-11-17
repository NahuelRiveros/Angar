import { NavLink } from "react-router-dom";
import { cn } from "../../../utils/cn.js";

/** Un ítem del menú lateral. Achicado solo muestra el ícono; el nombre queda para lectores de pantalla y como tooltip. */
export default function PanelItemMenu({ item, soloIcono = false, onNavegar }) {
  const Icono = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onNavegar}
      title={soloIcono ? item.label : undefined}
      className={({ isActive }) => cn(
        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition outline-none",
        "focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)",
        soloIcono && "justify-center px-0",
        isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
      )}
    >
      {({ isActive }) => <>
        {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-(--kt-turquoise)" />}
        {Icono && <Icono aria-hidden="true" className={cn("h-5 w-5 shrink-0", isActive && "text-(--kt-turquoise)")} />}
        <span className={cn("truncate", soloIcono && "sr-only")}>{item.label}</span>
      </>}
    </NavLink>
  );
}
