import { NavLink } from "react-router-dom";

// Los enlaces a secciones usan el hash; no se marcan todos activos en Inicio.
export default function NavbarLink({ item, onNavigate, base, active, inactive }) {
  const Icono = item.icon;
  const contenido = <>{Icono && <Icono size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />}<span>{item.label}</span></>;
  if (item.to.includes("#")) return <a href={item.to} onClick={onNavigate} className={[base, inactive].join(" ")}>{contenido}</a>;
  return <NavLink to={item.to} end={item.exact} onClick={onNavigate}
    className={({ isActive }) => [base, isActive ? active : inactive].join(" ")}>{contenido}</NavLink>;
}
