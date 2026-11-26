import { pantallasActivas } from "../../app/pantallas_activas.js";

// MOD-17: quién vende lo del catálogo (el módulo pedidos o un rubro), sin que el catálogo lo conozca.
// Sin nadie, el catálogo queda para consultar. `comprar`: { Ficha, useTarjeta }. Si hay un rubro, gana él (MOD-16).
export const compra = pantallasActivas.findLast((pantallas) => pantallas.comprar)?.comprar ?? null;
