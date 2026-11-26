import { opcionesTienda } from "../../../../../core/tienda_opciones.js";

// MOD-15: proyecto/tienda_config.js es opcional; si no está, el glob no encuentra nada y valen los de siempre.
// Solo lo usan pantallas (Vite): modulo.js no lo importa porque también lo leen los tests de Node.
const archivos = import.meta.glob("../../../../../proyecto/tienda_config.js", { eager: true });
export const tienda = opcionesTienda(Object.values(archivos)[0]?.tiendaConfig ?? {}).opciones;
