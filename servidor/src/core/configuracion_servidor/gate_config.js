// Gate maestro — la definición real vive en la raíz del repo
// (../../../../gate_config.js), compartida con el frontend (ver
// frontend/src/config/gate_config.js). Este archivo es el punto de entrada
// del lado del servidor: database/bootstrap.js lo usa para no sincronizar
// tablas de módulos apagados. Para editar los valores, andá al archivo raíz.
export { projectModules } from "../../../../proyecto/gate_config.js";
