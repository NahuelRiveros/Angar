import { ClipboardList, Trophy, UserCircle } from "lucide-react";

// Enlaces de "Mi cuenta" en el navbar.
export const accountLinks = [
  { label: "Mi perfil", to: "/mi-perfil", requiereAuth: true, icon: UserCircle },
  { label: "Mis inscripciones", to: "/mis-inscripciones", requiereAuth: true, icon: ClipboardList },
  // Para el jugador es la puerta para organizar; para el organizador, su plan.
  { label: "Organizar torneos", to: "/mi-suscripcion", requiereAuth: true, icon: Trophy },
];
