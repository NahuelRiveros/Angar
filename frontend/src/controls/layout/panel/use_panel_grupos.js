import { useMemo } from "react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { filtrarNavbarPorRol } from "../navbar/navbar_permissions.js";
import { panelGrupos } from "../../../config/navbar_config/panel_gestion.js";

/** Grupos del panel que el usuario puede ver: mismas reglas de rol y módulo que el navbar. */
export function usePanelGrupos() {
  const { usuario, modulosHabilitados } = useAuth();
  return useMemo(
    () => filtrarNavbarPorRol({ dropdowns: panelGrupos }, usuario, modulosHabilitados).dropdowns,
    [usuario, modulosHabilitados],
  );
}
