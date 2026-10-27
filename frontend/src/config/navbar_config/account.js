import { ClipboardList, Trophy } from "lucide-react";

// Enlaces de "Mi cuenta" en el navbar.
export const accountLinks = [
  { label: "Mis inscripciones", to: "/mis-inscripciones", requiereAuth: true, icon: ClipboardList },
  // Para el jugador es la puerta para organizar; para el organizador, su plan.
  { label: "Organizar torneos", to: "/mi-suscripcion", requiereAuth: true, icon: Trophy },
];
