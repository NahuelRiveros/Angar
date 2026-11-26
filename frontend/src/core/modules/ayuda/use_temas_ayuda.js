import { useMemo } from "react";
import { useAuth } from "../../auth/auth_context.jsx";
import { temasVisibles } from "./ayuda_temas.js";
import { todosLosTemas, contextoAyuda } from "./registro_ayuda.js";

/** AYU-04: los temas que puede ver quien está en el panel (cambian con sus permisos). */
export function useTemasAyuda() {
  const { usuario } = useAuth();
  return useMemo(() => temasVisibles(todosLosTemas, usuario, contextoAyuda), [usuario]);
}
