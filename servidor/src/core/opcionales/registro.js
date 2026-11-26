import { projectModules } from "../configuracion_servidor/gate_config.js";
import { resolverModulos } from "../../../../core/modulos_opcionales.js";

// Cómo se carga cada módulo opcional del core. Solo se importan los prendidos: uno apagado no define
// ni sus modelos.
const CARGADORES = {
  catalogo: async () => (await import("./catalogo/modulo.js")).moduloCatalogo,
  stock: async () => (await import("./stock/modulo.js")).moduloStock,
  pedidos: async () => (await import("./pedidos/modulo.js")).moduloPedidos,
};
export const CODIGOS_CARGABLES = Object.keys(CARGADORES);

const { activos, problemas } = resolverModulos(projectModules);

/** Textos de lo que está mal en gate_config.js: con alguno, el servidor no arranca (MOD-04, MOD-05). */
export const problemasDeModulos = problemas;

/** Módulos opcionales prendidos, cada uno después de los que necesita. */
export const opcionalesActivos = await Promise.all(activos.map((codigo) => CARGADORES[codigo]()));
