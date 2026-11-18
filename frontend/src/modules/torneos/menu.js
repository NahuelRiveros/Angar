import { CalendarDays, ClipboardList, CreditCard, Trophy, UserCircle } from "lucide-react";

// Menús del rubro, mismas reglas que adminDropdown (roles, permisos, requiereAuth). Los usa modulo.js.

export const linksTorneos = [
  { label: "Torneos", to: "/torneos", icon: CalendarDays },
  { label: "Mis torneos", to: "/mis-torneos", requiereAuth: true, roles: ["organizador"], icon: Trophy },
];

export const cuentaTorneos = [
  { label: "Mi perfil", to: "/mi-perfil", requiereAuth: true, icon: UserCircle },
  { label: "Mis inscripciones", to: "/mis-inscripciones", requiereAuth: true, icon: ClipboardList },
  // Para el jugador es la puerta para organizar; para el organizador, su plan.
  { label: "Organizar torneos", to: "/mi-suscripcion", requiereAuth: true, icon: Trophy },
];

// Grupo "Plataforma" del panel: lo del equipo que atiende a los organizadores.
export const panelTorneos = [
  {
    id: "plataforma",
    titulo: "Plataforma",
    items: [
      { label: "Planes de organizadores", to: "/admin/suscripciones", requiereAuth: true, permisos: ["suscripciones.ver"], icon: CreditCard },
    ],
  },
];
