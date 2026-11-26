import { projectModules } from "../core/config/gate_config.js";

// Rubros propios de este proyecto (sus datos: menús, footer, login). Los módulos opcionales del core
// no van acá: se prenden en proyecto/gate_config.js. Para sumar un rubro se crea su
// carpeta en src/modules/ con modulo.js y modulo_pantallas.jsx (ver core/modules/_scaffold)
// y se agrega acá, en pantallas_modulos.jsx y en proyecto/gate_config.js.
const INSTALADOS = [];

export const modulosActivos = INSTALADOS.filter((modulo) => projectModules[modulo.codigo]);
