import { projectModules } from "../config/gate_config.js";
import { moduloCatalogo } from "./catalogo/modulo.js";
import { moduloPedidos } from "./pedidos/modulo.js";
import { moduloStock } from "./stock/modulo.js";
import { resolverModulos } from "../../../../core/modulos_opcionales.js";

// Datos (menús, ayuda, textos) de cada módulo opcional que existe en el core. Sin pantallas: también
// los leen los tests de Node (ver registro_pantallas.js).
const INSTALADOS = [moduloCatalogo, moduloStock, moduloPedidos];

const { activos } = resolverModulos(projectModules);

/** Los prendidos en este proyecto, cada uno después de los que necesita. */
export const opcionalesActivos = activos.flatMap((codigo) => INSTALADOS.filter((modulo) => modulo.codigo === codigo));
