import { pantallasCatalogo } from "./catalogo/modulo_pantallas.jsx";
import { pantallasPedidos } from "./pedidos/modulo_pantallas.jsx";
import { pantallasStock } from "./stock/modulo_pantallas.jsx";
import { opcionalesActivos } from "./registro.js";

// Pantallas de cada módulo opcional (modulo_pantallas.jsx). Las páginas van con lazy(): las de un
// módulo apagado no se descargan nunca.
const INSTALADAS = [pantallasCatalogo, pantallasStock, pantallasPedidos];

export const pantallasOpcionales = opcionalesActivos.flatMap(({ codigo }) => INSTALADAS.filter((pantallas) => pantallas.codigo === codigo));
