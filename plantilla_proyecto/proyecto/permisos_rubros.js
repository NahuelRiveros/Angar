// Permisos de los rubros de ESTE proyecto (los del core están en core/permisos_config.js,
// que los suma a la misma lista). Cada rubro aporta { grupos: [...], permisos: [...] }.
// ⚠️ No cambiar un `codigo` existente: el arranque borra los que salen de la lista y,
// con ellos, lo que se haya tildado en el panel (PER-31).
export const PERMISOS_DE_RUBROS = [];

// PER-37 (opcional): roles propios de los rubros que no usan permisos del personal (como "cliente")
// y el rol de quien se registra. Ej.: { fuera: { jugador: "Jugador" }, alRegistrarse: "jugador" }.
// PER-38 (opcional): `equipo` reemplaza los roles del personal que siembra el core (supervisor y vendedor).
// Ej.: { equipo: { soporte: "Soporte" } }. El primero es el de una persona nueva del equipo.
export const ROLES_DE_RUBROS = {};
