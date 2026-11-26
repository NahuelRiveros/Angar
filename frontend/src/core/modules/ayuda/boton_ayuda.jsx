import { Link } from "react-router-dom";
import { CircleHelp } from "lucide-react";
import { useTemasAyuda } from "./use_temas_ayuda.js";

/** AYU-05: "?" que abre el tema de la pantalla. No aparece si esa persona no puede ver el tema (AYU-04). */
export default function BotonAyuda({ tema, className = "" }) {
  const visible = useTemasAyuda().find((t) => t.id === tema);
  if (!visible) return null;
  return (
    <Link to={`/panel/ayuda/${tema}`} aria-label={`Ayuda: ${visible.titulo}`} title={`Ayuda: ${visible.titulo}`}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--kt-teal-700) outline-none hover:bg-(--kt-turquoise-soft) focus-visible:ring-2 focus-visible:ring-(--kt-turquoise) ${className}`}>
      <CircleHelp aria-hidden="true" className="h-5 w-5" />
    </Link>
  );
}
