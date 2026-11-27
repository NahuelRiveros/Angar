/**
 * PLANTILLA — controller: una línea por ruta (ficha: docs/specs/core/servidor.md). Ejemplo real:
 * opcionales/pedidos/pedidos_controller.js.
 *
 * `datos(...)` responde { ok, data }; `hecho(codigo, mensaje, ...)` responde { ok, codigo, mensaje, data? }.
 * Lo validado por `validar` llega como primer argumento ({ body, params, query }); el usuario de la sesión,
 * como segundo. Sin try/catch: los errores los responde el manejador central de app.js.
 *
 * Cómo usarla: copiá a `controllers/<dominio>/mi_entidad_controller.js` (o al rubro) y cambiá el import.
 */
import { datos, hecho } from "../common/responder.js";
import * as entidades from "../../services/_scaffold/entidad_service_scaffold.js"; // TODO: service real

export const listarEntidadesController = datos(() => entidades.listarEntidades());
export const crearEntidadController = hecho("ENTIDAD_CREADA", "Entidad creada.", ({ body }) => entidades.crearEntidad(body), 201);
export const actualizarEntidadController = hecho("ENTIDAD_ACTUALIZADA", "Entidad actualizada.", ({ params, body }) => entidades.actualizarEntidad(params.id, body));
export const eliminarEntidadController = hecho("ENTIDAD_ELIMINADA", "Entidad eliminada.", ({ params }) => entidades.eliminarEntidad(params.id));
