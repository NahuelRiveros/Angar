import { Shield, KeyRound } from "lucide-react";
import { suscripcionDelSoftwareActiva } from "../../../../../core/suscripcion_software_config.js";

// Solo del Administrador del sistema; sin ítems de un rubro.
export const superAdminDropdown = {
  id: "super_admin",
  labelNoAuth: "Configuración",
  labelAuth: "Configuración",
  icon: Shield,
  items: suscripcionDelSoftwareActiva ? [
    {
      label: "Suscripción del sistema",
      to: "/super-admin/suscripcion",
      requiereAuth: true,
      roles: ["super_admin"],
      icon: KeyRound,
    },
  ] : [],
};
