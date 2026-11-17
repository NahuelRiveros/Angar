import { projectModules } from "../core/configuracion_servidor/gate_config.js";

// Módulos de rubro instalados en este proyecto. El core (rutas, bootstrap, seed) solo
// recorre esta lista: para sumar un rubro se crea su carpeta en src/modulos/ con su
// modulo.js (ver los moldes _scaffold del core) y se agrega acá y en proyecto/gate_config.js.
const INSTALADOS = [];

export const modulosActivos = INSTALADOS.filter((modulo) => projectModules[modulo.codigo]);
