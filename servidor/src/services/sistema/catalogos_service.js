import { TipoDocumento, Sexo, TipoPersona, CategoriaProducto } from "../../models/index.js";
import { projectModules } from "../../configuracion_servidor/gate_config.js";
import { listarOpciones } from "../common/select_options.js";

export async function obtenerCatalogos() {
  const [tiposDocumento, sexos, tiposPersona, categoriasProducto] = await Promise.all([
    listarOpciones(TipoDocumento),
    listarOpciones(Sexo),
    listarOpciones(TipoPersona),
    // La tabla solo existe con el módulo stock (ver bootstrap.js).
    projectModules.stock ? listarOpciones(CategoriaProducto, { where: { activo: true } }) : [],
  ]);
  return { tiposDocumento, sexos, tiposPersona, categoriasProducto };
}
