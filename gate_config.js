// GATE MAESTRO — qué tipo de proyecto es este cliente.
//
// Vive en la raíz del repo (no dentro de frontend/ ni de servidor/) porque
// los dos lados lo leen: el frontend lo usa para armar navbar/rutas
// (frontend/src/config/gate_config.js re-exporta este archivo) y el
// backend lo usa para decidir qué tablas sincronizar al bootstrapear la
// base (servidor/src/configuracion_servidor/gate_config.js también
// re-exporta este archivo, ver database/bootstrap.js). Un solo objeto,
// se edita acá y ya — ningún otro archivo debería declarar sus propios
// valores de projectModules.
//
// Tocar estos valores alcanza para prender/apagar un módulo entero
// (rutas, navbar, tablas de base de datos). DistribuCG es solo distribuidora:
// gimnasio y kinesiología se sacaron del proyecto (código y tablas).
//
// cart_config.js y catalog_config.js leen su flag principal de acá pero además agregan
// más campos (métodos de pago, si el checkout está listo, textos del menú
// de catálogo, etc.) — para esos ajustes finos DENTRO de un módulo ya
// habilitado se sigue tocando el config específico de ese módulo, este
// archivo es solo el "¿lo tiene o no lo tiene?".
//
// `stock` existe completo del lado del servidor (models/kiosco,
// services/stock, controllers/stock, routes/stock, gate propio en
// modulo_negocio) pero todavía no tiene ninguna pantalla en el frontend —
// nadie lo consume hoy. Se declara acá en `false` para que el gate maestro
// quede completo y sea la referencia real de qué módulos existen en el
// proyecto, aunque del lado del frontend este flag en particular no filtre
// nada en el navbar todavía (no hay dropdown de stock que gatear) — del
// lado del backend SÍ evita sincronizar sus tablas si está en `false`.
//
// Ver también: scripts/analizar_modulos.mjs (reporta qué carpetas le
// corresponden a cada módulo) y servidor/src/database/bootstrap.js (usa
// estos flags para no crear tablas de módulos apagados en el deploy).
export const projectModules = {
  eccomerce_indumentaria: false,
  eccomerce_distribuidora: true,
  stock: false,
};
