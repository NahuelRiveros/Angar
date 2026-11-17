/**
 * La portada ("/") la elige el proyecto: el primer rubro activo que trae `inicio` en sus pantallas
 * (modulo_pantallas.jsx) pone la suya; si ninguno la trae, queda la del core.
 */
export function inicioDelProyecto(pantallas, porDefecto) {
  return pantallas.find((p) => p.inicio)?.inicio ?? porDefecto;
}
