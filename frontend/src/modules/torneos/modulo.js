import { Trophy } from "lucide-react";
import { linksTorneos, cuentaTorneos, panelTorneos } from "./menu.js";

// Lo que el core (menús, panel, registro) necesita saber de este rubro. Solo datos, sin
// pantallas: también lo leen los tests de Node (ver modulo_pantallas.jsx).
export const moduloTorneos = {
  codigo: "torneos",
  icono: Trophy,

  menu: {
    links: linksTorneos,
    cuenta: cuentaTorneos,
    panel: panelTorneos,
  },

  // USU-43: quien se registra sin venir de otra página conoce su perfil y su código de jugador.
  registro: { destino: "/mi-perfil?bienvenida=1" },
};
