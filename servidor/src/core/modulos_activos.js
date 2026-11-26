import { opcionalesActivos, problemasDeModulos } from "./opcionales/registro.js";
import { choquesDeModulos } from "./opcionales/verificar.js";
import { registrarEnganches } from "./opcionales/enganches.js";
import { modulosActivos as rubrosActivos } from "../proyecto/modulos.js";
import { TABLAS_RETIRADAS } from "../proyecto/tablas_retiradas.js";
import { CODIGOS_PERMISO } from "../../../core/permisos_config.js";
import { MODULOS_OPCIONALES } from "../../../core/modulos_opcionales.js";

// Todo lo prendido en este proyecto: primero los módulos opcionales del core, después los rubros
// (que pueden apoyarse en ellos). El resto del core solo recorre esta lista.
export const modulosActivos = [...opcionalesActivos, ...rubrosActivos];
registrarEnganches(modulosActivos);

/** Frena el arranque, antes de tocar la base, si la configuración de módulos no es válida. */
export function exigirModulosValidos() {
  const problemas = [
    ...problemasDeModulos,
    ...choquesDeModulos({ definiciones: MODULOS_OPCIONALES, opcionales: opcionalesActivos, rubros: rubrosActivos, tablasRetiradas: TABLAS_RETIRADAS, codigosPermiso: CODIGOS_PERMISO }),
  ];
  if (problemas.length) throw new Error(`La configuración de módulos no es válida:\n${problemas.map((p) => `  - ${p}`).join("\n")}`);
}
