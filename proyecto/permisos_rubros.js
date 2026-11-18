// Permisos de los rubros de ESTE proyecto (los del core están en core/permisos_config.js,
// que los suma a la misma lista). Cada rubro aporta { grupos: [...], permisos: [...] }.
// ⚠️ No cambiar un `codigo` existente: el arranque borra los que salen de la lista y,
// con ellos, lo que se haya tildado en el panel (PER-31).
export const PERMISOS_DE_RUBROS = [
  {
    // Torneos: el plan de los organizadores lo revisa el equipo de la plataforma.
    grupos: [{ codigo: "plataforma", nombre: "Plataforma" }],
    permisos: [
      { codigo: "suscripciones.ver", grupo: "plataforma", nombre: "Ver planes de organizadores", descripcion: "Organizadores, vencimientos y pagos recibidos.", porDefecto: ["soporte"] },
      { codigo: "suscripciones.gestionar", grupo: "plataforma", nombre: "Activar o extender planes", descripcion: "Aprobar transferencias y habilitar días a mano (cortesías).", porDefecto: [], requiere: ["suscripciones.ver"] },
    ],
  },
];

// PER-37: en MiPadel todos se registran como jugador; organizador se suma al empezar a organizar.
// Ninguno de los dos usa permisos del personal: lo de un torneo lo autoriza ser su dueño.
export const ROLES_DE_RUBROS = {
  fuera: { jugador: "Jugador", organizador: "Organizador" },
  alRegistrarse: "jugador",
  // PER-38: el único rol del equipo es soporte (atiende a los organizadores); supervisor y vendedor no van.
  equipo: { soporte: "Soporte" },
};
