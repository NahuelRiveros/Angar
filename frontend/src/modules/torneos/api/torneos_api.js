import { http } from "../../../api/http.js";

// Todas las escrituras devuelven el torneo completo actualizado (se guarda directo en la caché).
export async function getMisTorneos({ page = 1, limit = 20 } = {}) {
  const r = await http.get("/torneos", { params: { page, limit } });
  return r.data;
}

export async function getTorneo(id) {
  const r = await http.get(`/torneos/${id}`);
  return r.data.data;
}

export async function crearTorneo(datos) {
  const r = await http.post("/torneos", datos);
  return r.data;
}

export async function actualizarTorneo(id, datos) {
  const r = await http.patch(`/torneos/${id}`, datos);
  return r.data;
}

export async function cambiarEstadoTorneo(id, estado) {
  const r = await http.patch(`/torneos/${id}/estado`, { estado });
  return r.data;
}

export async function eliminarTorneo(id) {
  const r = await http.delete(`/torneos/${id}`);
  return r.data;
}

export async function crearCategoria(torneoId, datos) {
  const r = await http.post(`/torneos/${torneoId}/categorias`, datos);
  return r.data;
}

export async function actualizarCategoria(torneoId, categoriaId, datos) {
  const r = await http.patch(`/torneos/${torneoId}/categorias/${categoriaId}`, datos);
  return r.data;
}

export async function eliminarCategoria(torneoId, categoriaId) {
  const r = await http.delete(`/torneos/${torneoId}/categorias/${categoriaId}`);
  return r.data;
}

export async function guardarPremios(torneoId, categoriaId, premios) {
  const r = await http.put(`/torneos/${torneoId}/categorias/${categoriaId}/premios`, { premios });
  return r.data;
}

// ── Inscripciones (organizador) ─────────────────────────────────────────────
export async function getInscripciones(torneoId) {
  const r = await http.get(`/torneos/${torneoId}/inscripciones`);
  return r.data.data;
}

export async function cargarPareja(torneoId, datos) {
  const r = await http.post(`/torneos/${torneoId}/inscripciones`, datos);
  return r.data;
}

export async function editarPareja(torneoId, inscripcionId, datos) {
  const r = await http.patch(`/torneos/${torneoId}/inscripciones/${inscripcionId}`, datos);
  return r.data;
}

/** accion: "confirmar" | "rechazar" | "baja". */
export async function resolverInscripcion(torneoId, inscripcionId, accion, cuerpo) {
  const r = await http.post(`/torneos/${torneoId}/inscripciones/${inscripcionId}/${accion}`, cuerpo);
  return r.data;
}

// ── Zonas y resultados (organizador) ────────────────────────────────────────
export async function getZonas(torneoId, categoriaId) {
  const r = await http.get(`/torneos/${torneoId}/categorias/${categoriaId}/zonas`);
  return r.data.data;
}

export async function sortearZonas(torneoId, categoriaId) {
  const r = await http.post(`/torneos/${torneoId}/categorias/${categoriaId}/zonas/generar`);
  return r.data;
}

export async function moverPareja(torneoId, categoriaId, inscripcionId, zonaId) {
  const r = await http.post(`/torneos/${torneoId}/categorias/${categoriaId}/zonas/mover`, { inscripcion_id: inscripcionId, zona_id: zonaId });
  return r.data;
}

/** Día, hora y cancha; strings vacíos borran el dato. */
export async function programarPartido(torneoId, partidoId, { fecha, hora, cancha }) {
  const r = await http.put(`/torneos/${torneoId}/partidos/${partidoId}/programacion`, { fecha, hora, cancha });
  return r.data;
}

export async function guardarResultado(torneoId, partidoId, sets) {
  const r = await http.put(`/torneos/${torneoId}/partidos/${partidoId}/resultado`, { sets });
  return r.data;
}

export async function borrarResultado(torneoId, partidoId) {
  const r = await http.delete(`/torneos/${torneoId}/partidos/${partidoId}/resultado`);
  return r.data;
}

// ── Público y jugador ───────────────────────────────────────────────────────
/** Filtros opcionales: q, estado, rama y nivel; los vacíos no se mandan. */
export async function getTorneosPublicos({ page = 1, ...filtros } = {}) {
  const params = Object.fromEntries(Object.entries({ page, ...filtros }).filter(([, v]) => v !== "" && v != null));
  const r = await http.get("/publico/torneos", { params, publicAccess: true });
  return r.data;
}

export async function getTorneoPublico(id) {
  const r = await http.get(`/publico/torneos/${id}`, { publicAccess: true });
  return r.data.data;
}

export async function anotarme(datos) {
  const r = await http.post("/inscripciones", datos);
  return r.data;
}

export async function getMisInscripciones() {
  const r = await http.get("/inscripciones/mias");
  return r.data.data;
}

export async function cancelarMiInscripcion(id) {
  const r = await http.post(`/inscripciones/${id}/cancelar`);
  return r.data;
}

// ── Llave (organizador) ─────────────────────────────────────────────────────
export async function getLlave(torneoId, categoriaId) {
  const r = await http.get(`/torneos/${torneoId}/categorias/${categoriaId}/llave`);
  return r.data.data;
}

/** accion: "armar" | "deshacer". */
export async function cambiarLlave(torneoId, categoriaId, accion) {
  const r = await http.post(`/torneos/${torneoId}/categorias/${categoriaId}/llave/${accion}`);
  return r.data;
}

export async function getCategoriaPublica(torneoId, categoriaId) {
  const r = await http.get(`/publico/torneos/${torneoId}/categorias/${categoriaId}`, { publicAccess: true });
  return r.data.data;
}
