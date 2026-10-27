import { Trophy } from "lucide-react";

// Enlaces de "Mi cuenta" en el navbar.
export const accountLinks = [
  // Para el jugador es la puerta para organizar; para el organizador, su plan.
  { label: "Organizar torneos", to: "/mi-suscripcion", requiereAuth: true, icon: Trophy },
];
