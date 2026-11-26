import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { opcionesTienda } from "../../../../../core/tienda_opciones.js";

// MOD-15: proyecto/tienda_config.js es opcional. Si está mal escrito, el servidor no arranca.
const archivo = new URL("../../../../../proyecto/tienda_config.js", import.meta.url);
const propias = existsSync(fileURLToPath(archivo)) ? (await import(archivo.href)).tiendaConfig ?? {} : {};
const { opciones, problemas } = opcionesTienda(propias);
if (problemas.length) throw new Error(`La configuración de la tienda no es válida:\n${problemas.map((p) => `  - ${p}`).join("\n")}`);

export const opcionesPedidos = opciones;
