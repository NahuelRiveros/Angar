import { TipoDocumento, Sexo, TipoPersona } from "../../models/index.js";
import { listarOpciones } from "../common/select_options.js";

export async function obtenerCatalogos() {
  const [tiposDocumento, sexos, tiposPersona] = await Promise.all([
    listarOpciones(TipoDocumento),
    listarOpciones(Sexo),
    listarOpciones(TipoPersona),
  ]);
  return { tiposDocumento, sexos, tiposPersona };
}
