import { unirRutas } from "./unir_rutas.js";
import { pantallasOpcionales } from "../opcionales/registro_pantallas.js";
import { pantallasActivas as pantallasRubros } from "../../proyecto/pantallas_modulos.jsx";

// Pantallas de todo lo prendido: los módulos opcionales del core y los rubros propios.
export const pantallasActivas = [...pantallasOpcionales, ...pantallasRubros];

/** MOD-16: las rutas de todo lo prendido; si un rubro repite la dirección de un módulo, queda la del rubro. */
export const rutasActivas = (clave) => unirRutas(pantallasActivas, clave);
