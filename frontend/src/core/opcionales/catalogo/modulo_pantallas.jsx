import { lazy } from "react";
import { rutasPanel, rutasTienda } from "./rutas.jsx";

export const pantallasCatalogo = {
  codigo: "catalogo",
  rutasTienda,
  rutasPanel,
  InicioTienda: lazy(() => import("./web/inicio_catalogo.jsx")),
};
