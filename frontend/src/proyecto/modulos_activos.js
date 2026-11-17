import { projectModules } from "../core/config/gate_config.js";
import { moduloTorneos } from "../modules/torneos/modulo.js";

// Módulos de rubro instalados (sus datos: menús, footer, login). Para sacar un rubro se
// borra su carpeta y su línea acá y en pantallas_modulos.jsx; para sumar uno, se crea su
// carpeta con modulo.js y modulo_pantallas.jsx y se agrega en los dos registros y en gate_config.js.
const INSTALADOS = [moduloTorneos];

export const modulosActivos = INSTALADOS.filter((modulo) => projectModules[modulo.codigo]);

// El primer módulo activo con tienda decide catálogo, footer y destino después del login.
// MiPadel no tiene tienda.
export const tiendaActiva = modulosActivos.find((modulo) => modulo.tienda)?.tienda ?? null;
