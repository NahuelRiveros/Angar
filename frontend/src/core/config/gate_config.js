// Gate maestro — la definición real vive en la raíz del repo
// (../../../gate_config.js) porque el backend también lo lee (ver
// servidor/src/configuracion_servidor/gate_config.js y database/bootstrap.js).
// Este archivo es solo el re-export para que los ~13 imports existentes en
// el frontend no cambien. Para editar los valores, andá al archivo raíz.
export { projectModules } from "../../../../proyecto/gate_config.js";
