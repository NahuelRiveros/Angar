import { PRODUCTOS_ALIMENTOS_NATURALES } from "./alimentos_naturales.js";
import { PRODUCTOS_ALMACEN } from "./almacen.js";
import { PRODUCTOS_BAZAR } from "./bazar.js";
import { PRODUCTOS_BEBES } from "./bebes.js";
import { PRODUCTOS_BEBIDAS } from "./bebidas.js";
import { PRODUCTOS_CONGELADOS } from "./congelados.js";
import { PRODUCTOS_DESAYUNO_Y_MERIENDA } from "./desayuno_y_merienda.js";
import { PRODUCTOS_FERRETERIA } from "./ferreteria.js";
import { PRODUCTOS_FIAMBRES } from "./fiambres.js";
import { PRODUCTOS_GOLOSINAS } from "./golosinas.js";
import { PRODUCTOS_HIGIENE_PERSONAL } from "./higiene_personal.js";
import { PRODUCTOS_LACTEOS } from "./lacteos.js";
import { PRODUCTOS_LIBRERIA } from "./libreria.js";
import { PRODUCTOS_LIMPIEZA } from "./limpieza.js";
import { PRODUCTOS_MASCOTAS } from "./mascotas.js";
import { PRODUCTOS_PANIFICADOS } from "./panificados.js";
import { PRODUCTOS_PAPELERA } from "./papelera.js";
import { PRODUCTOS_PASTAS_FRESCAS_Y_TAPAS } from "./pastas_frescas_y_tapas.js";
import { PRODUCTOS_PERFUMERIA } from "./perfumeria.js";
import { PRODUCTOS_REPOSTERIA } from "./reposteria.js";
import { PRODUCTOS_SNACKS } from "./snacks.js";

// Registro explícito: al agregar una familia, importar su archivo aquí.
export const PRODUCTOS_POR_FAMILIA = {
  "Alimentos Naturales": PRODUCTOS_ALIMENTOS_NATURALES,
  "Almacén": PRODUCTOS_ALMACEN,
  "Bazar": PRODUCTOS_BAZAR,
  "Bebés": PRODUCTOS_BEBES,
  "Bebidas": PRODUCTOS_BEBIDAS,
  "Congelados": PRODUCTOS_CONGELADOS,
  "Desayuno y Merienda": PRODUCTOS_DESAYUNO_Y_MERIENDA,
  "Ferretería": PRODUCTOS_FERRETERIA,
  "Fiambres": PRODUCTOS_FIAMBRES,
  "Golosinas": PRODUCTOS_GOLOSINAS,
  "Higiene Personal": PRODUCTOS_HIGIENE_PERSONAL,
  "Lácteos": PRODUCTOS_LACTEOS,
  "Librería": PRODUCTOS_LIBRERIA,
  "Limpieza": PRODUCTOS_LIMPIEZA,
  "Mascotas": PRODUCTOS_MASCOTAS,
  "Panificados": PRODUCTOS_PANIFICADOS,
  "Papelera": PRODUCTOS_PAPELERA,
  "Pastas Frescas y Tapas": PRODUCTOS_PASTAS_FRESCAS_Y_TAPAS,
  "Perfumería": PRODUCTOS_PERFUMERIA,
  "Repostería": PRODUCTOS_REPOSTERIA,
  "Snacks": PRODUCTOS_SNACKS,
};

export const PRODUCTOS_INICIALES = Object.fromEntries(
  Object.values(PRODUCTOS_POR_FAMILIA).flatMap((catalogo) => Object.entries(catalogo)),
);
