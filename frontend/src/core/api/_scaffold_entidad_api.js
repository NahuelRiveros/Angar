/**
 * PLANTILLA — API de una entidad (ver modules/_scaffold/entidad_page_scaffold.jsx). Responde al router de
 * servidor/src/core/routes/_scaffold/. Al copiarla al rubro (modules/<rubro>/api.js), cambiá "/entidades".
 */
import { http } from "./http.js";

const datos = (promesa) => promesa.then((r) => r.data.data);
const respuesta = (promesa) => promesa.then((r) => r.data);

export const getEntidades = () => datos(http.get("/entidades"));
export const guardarEntidad = ({ id, ...entidad }) => respuesta(id ? http.put(`/entidades/${id}`, entidad) : http.post("/entidades", entidad));
export const eliminarEntidad = (id) => respuesta(http.delete(`/entidades/${id}`));
