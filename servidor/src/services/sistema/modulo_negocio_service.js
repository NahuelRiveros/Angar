import { ModuloNegocio } from "../../models/index.js";
import { crearCrudService } from "../common/crud_service.js";

// actualizarModuloNegocio busca por "codigo", no por "id" — no encaja con
// cambiarEstado(id, activo) del helper, así que queda manual.
const modulosCrud = crearCrudService(ModuloNegocio, { defaultOrder: [["codigo", "ASC"]] });

/** { eccomerce_distribuidora: true, stock: false, ... } — usado por el frontend (nav/footer) y por el middleware. */
export async function obtenerEstadoModulos() {
  const modulos = await ModuloNegocio.findAll({ attributes: ["codigo", "habilitado"] });
  return Object.fromEntries(modulos.map((m) => [m.codigo, m.habilitado]));
}

export async function moduloNegocioHabilitado(codigo) {
  const modulo = await ModuloNegocio.findOne({ where: { codigo } });
  // Si el módulo no existe en la tabla (código mal escrito, etc.) no bloqueamos:
  // el gate solo debe restringir módulos conocidos y explícitamente apagados.
  return modulo ? modulo.habilitado : true;
}

export async function listarModulosNegocio() {
  return modulosCrud.listar();
}

export async function actualizarModuloNegocio(codigo, habilitado) {
  const modulo = await ModuloNegocio.findOne({ where: { codigo } });
  if (!modulo) return { ok: false, codigo: "NO_EXISTE", mensaje: "El módulo no existe" };

  await modulo.update({ habilitado: !!habilitado });
  return {
    ok: true,
    mensaje: habilitado ? "Módulo habilitado correctamente" : "Módulo deshabilitado correctamente",
    modulo,
  };
}
