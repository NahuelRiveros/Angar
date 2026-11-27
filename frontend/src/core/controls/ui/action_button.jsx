import { claseBoton } from "./estilos.js";

/** Botón del kit. `variante`: principal (por defecto), secundario, peligro, compra o whatsapp; `tamano`: normal o grande. */
export default function ActionButton({ children, className = "", variante = "principal", tamano = "normal", ...props }) {
  return <button type="button" {...props} className={`${claseBoton(variante, tamano)} ${className}`}>{children}</button>;
}
