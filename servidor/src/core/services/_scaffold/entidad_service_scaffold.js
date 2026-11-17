/**
 * PLANTILLA — service de una entidad con baja lógica. Ejemplo real: services/sistema/banner_promocion_service.js.
 *
 * Reglas del patrón:
 *   - Recibe datos ya validados (el router usa `validar` con los esquemas de entidad_esquemas_scaffold.js).
 *   - Devuelve los datos; si algo esperado falla ("no existe", "ya existe"), LANZA un ErrorApp con su
 *     código, mensaje en español y estado HTTP. Nunca devuelve { ok: false }.
 *   - Lo que toca dinero, stock o varias tablas va en `sequelize.transaction`.
 *
 * Cómo usarla: copiá a `services/<dominio>/mi_entidad_service.js`, cambiá el import por el modelo
 * real (de models/index.js) y reemplazá "Entidad".
 */
import { Entidad } from "../../models/_scaffold/entidad_model_scaffold.js"; // TODO: from "../../models/index.js"
import { ErrorApp, noExiste } from "../common/errores.js";

const CAMPOS = ["id", "nombre", "orden"];
const activas = { fecha_baja: null };

async function buscar(id) {
  const entidad = await Entidad.findOne({ where: { id, ...activas } });
  if (!entidad) throw noExiste("La entidad no existe.");
  return entidad;
}

async function verificarNombreLibre(nombre, excluirId = null) {
  const otra = await Entidad.findOne({ where: { nombre, ...activas } });
  if (otra && otra.id !== excluirId) throw new ErrorApp("NOMBRE_DUPLICADO", `Ya existe "${nombre}".`, 409);
}

export async function listarEntidades() {
  return Entidad.findAll({ where: activas, attributes: CAMPOS, order: [["orden", "ASC"], ["nombre", "ASC"]] });
}

export async function crearEntidad(datos) {
  await verificarNombreLibre(datos.nombre);
  return Entidad.create(datos);
}

export async function actualizarEntidad(id, datos) {
  const entidad = await buscar(id);
  await verificarNombreLibre(datos.nombre, entidad.id);
  return entidad.update(datos);
}

export async function eliminarEntidad(id) {
  const entidad = await buscar(id);
  await entidad.update({ fecha_baja: new Date() });
}
