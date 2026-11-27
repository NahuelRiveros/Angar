import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { claseBoton } from "./estilos.js";

/**
 * Botón del kit. `variante`: principal (por defecto), secundario, peligro, compra o whatsapp; `tamano`:
 * normal o grande. `to`: se muestra como link con forma de botón. `cargando`: se deshabilita y gira el
 * ícono (un doble clic no manda dos veces).
 */
export default function ActionButton({ children, className = "", variante = "principal", tamano = "normal", to, cargando = false, disabled, ...props }) {
  const clases = `${claseBoton(variante, tamano)} ${className}`;
  if (to) return <Link to={to} {...props} className={clases}>{children}</Link>;
  return (
    <button type="button" {...props} disabled={disabled || cargando} aria-busy={cargando || undefined} className={clases}>
      {cargando && <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />}
      {children}
    </button>
  );
}
