import { projectModules } from "../core/config/gate_config.js";

// Módulos de rubro instalados (sus datos: menús, footer, login). Para sumar uno se crea su
// carpeta en src/modules/ con modulo.js y modulo_pantallas.jsx (ver core/modules/_scaffold)
// y se agrega acá, en pantallas_modulos.jsx y en proyecto/gate_config.js.
const INSTALADOS = [];

export const modulosActivos = INSTALADOS.filter((modulo) => projectModules[modulo.codigo]);

// El primer módulo activo con tienda decide catálogo, footer y destino después del login.
export const tiendaActiva = modulosActivos.find((modulo) => modulo.tienda)?.tienda ?? null;
