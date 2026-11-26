import { CatCategoria, CatFoto, CatProducto, CatVariante } from "./modelos.js";
import { catalogoRouter } from "./catalogo_router.js";

// Spec: docs/specs/core/catalogo.md.
export const moduloCatalogo = {
  codigo: "catalogo",
  modelos: [CatCategoria, CatProducto, CatVariante, CatFoto],
  migraciones: new URL("./migraciones/", import.meta.url),
  rutas: [["/catalogo", catalogoRouter]],
};
