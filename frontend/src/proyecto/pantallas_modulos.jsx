import { modulosActivos } from "./modulos_activos.js";

// Pantallas de cada módulo de rubro instalado (ver modulos_activos.js).
const INSTALADAS = [];

const activos = new Set(modulosActivos.map((modulo) => modulo.codigo));
export const pantallasActivas = INSTALADAS.filter((pantallas) => activos.has(pantallas.codigo));
