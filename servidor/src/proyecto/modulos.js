import { projectModules } from "../core/configuracion_servidor/gate_config.js";
import { moduloTorneos } from "../modulos/torneos/modulo.js";

// Módulos de rubro instalados en este proyecto. El core (rutas, bootstrap, seed) solo
// recorre esta lista: para sacar un rubro se borra su carpeta y su línea acá;
// para sumar uno, se crea su carpeta con su modulo.js y se agrega acá y en gate_config.js.
const INSTALADOS = [moduloTorneos];

export const modulosActivos = INSTALADOS.filter((modulo) => projectModules[modulo.codigo]);
