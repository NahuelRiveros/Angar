import { opcionalesActivos } from "../opcionales/registro.js";
import { modulosActivos as rubrosActivos } from "../../proyecto/modulos_activos.js";

// Todo lo prendido en este proyecto: los módulos opcionales del core y los rubros propios.
export const modulosActivos = [...opcionalesActivos, ...rubrosActivos];

// Quién decide catálogo, footer y destino después del login: primero un rubro, si no un módulo del core.
export const tiendaActiva = [...rubrosActivos, ...opcionalesActivos].find((modulo) => modulo.tienda)?.tienda ?? null;
