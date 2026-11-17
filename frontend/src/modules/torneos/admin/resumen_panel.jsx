import { useAuth } from "../../../core/auth/auth_context.jsx";
import { tienePermiso } from "../../../../../core/permisos_config.js";
import ResumenSuscripciones from "./resumen_suscripciones.jsx";
import RegistradosResumen from "./registrados_resumen.jsx";
import DemoTorneosTarjeta from "./demo_torneos_tarjeta.jsx";

/** Lo de torneos en el inicio del panel (el core pone el saludo y los accesos). */
export default function ResumenPanelTorneos() {
  const { usuario } = useAuth();
  const esSuperAdmin = usuario?.roles?.includes("super_admin");
  return (
    <>
      {tienePermiso(usuario, "suscripciones.ver") && <ResumenSuscripciones />}
      {/* Cantidad y nombres de los usuarios: solo el super admin (el servidor también lo exige). */}
      {esSuperAdmin && <RegistradosResumen />}
      {esSuperAdmin && <DemoTorneosTarjeta />}
    </>
  );
}
