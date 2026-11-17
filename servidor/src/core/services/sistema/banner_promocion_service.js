import { Op } from "sequelize";
import { BannerPromocion } from "../../models/index.js";
import { ErrorApp, noExiste } from "../common/errores.js";
import { TOPE_ACTIVOS, estadoBanner, hoyArgentina } from "./banner_reglas.js";

const ORDEN = [["orden", "ASC"], ["id", "ASC"]];
const CAMPOS_PUBLICOS = ["id", "tipo", "titulo", "imagen_url", "imagen_celular_url", "enlace"];

// Cada visita al sitio pide los banners: se guardan un minuto en memoria para no consultar la
// base remota en cada página. Cualquier cambio desde el panel la vacía al instante.
const CACHE_MS = 60 * 1000;
let cache = null;
const vaciarCache = () => { cache = null; };

const vigenteHoy = (hoy) => ({
  activo: true,
  [Op.and]: [
    { [Op.or]: [{ vigente_desde: null }, { vigente_desde: { [Op.lte]: hoy } }] },
    { [Op.or]: [{ vigente_hasta: null }, { vigente_hasta: { [Op.gte]: hoy } }] },
  ],
});

/** Público (SIS-34): solo los que se ven hoy, separados por tipo. */
export async function listarVigentes() {
  const hoy = hoyArgentina();
  if (cache && cache.hoy === hoy && Date.now() - cache.en < CACHE_MS) return cache.datos;

  const banners = await BannerPromocion.findAll({ where: vigenteHoy(hoy), attributes: CAMPOS_PUBLICOS, order: ORDEN });
  const datos = {
    carrusel: banners.filter((b) => b.tipo === "carrusel"),
    cinta: banners.filter((b) => b.tipo === "cinta"),
  };
  cache = { hoy, en: Date.now(), datos };
  return datos;
}

/** Panel (SIS-36): todos, con el estado calculado para hoy. */
export async function listarTodos() {
  const hoy = hoyArgentina();
  const banners = await BannerPromocion.findAll({ order: [["tipo", "ASC"], ...ORDEN] });
  return banners.map((b) => ({ ...b.toJSON(), estado: estadoBanner(b, hoy) }));
}

/** SIS-39: los vencidos no cuentan, aunque sigan tildados como activos. */
async function verificarTope(tipo, excluirId = null) {
  const hoy = hoyArgentina();
  const activos = await BannerPromocion.count({
    where: {
      tipo,
      activo: true,
      [Op.or]: [{ vigente_hasta: null }, { vigente_hasta: { [Op.gte]: hoy } }],
      ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}),
    },
  });
  if (activos >= TOPE_ACTIVOS[tipo]) {
    throw new ErrorApp(
      "TOPE_ALCANZADO",
      `Podés tener hasta ${TOPE_ACTIVOS[tipo]} banners de ${tipo} activos. Desactivá uno antes de sumar otro.`,
      409,
    );
  }
}

async function buscar(id) {
  const banner = await BannerPromocion.findByPk(id);
  if (!banner) throw noExiste("El banner no existe.");
  return banner;
}

export async function crear(datos) {
  if (datos.activo) await verificarTope(datos.tipo);
  const banner = await BannerPromocion.create(datos);
  vaciarCache();
  return banner;
}

export async function actualizar(id, datos) {
  const banner = await buscar(id);
  if (datos.activo) await verificarTope(datos.tipo, banner.id);
  await banner.update({ ...datos, actualizado_en: new Date() });
  vaciarCache();
  return banner;
}

export async function cambiarEstado(id, activo) {
  const banner = await buscar(id);
  if (activo) await verificarTope(banner.tipo, banner.id);
  await banner.update({ activo, actualizado_en: new Date() });
  vaciarCache();
  return banner;
}

export async function eliminar(id) {
  const banner = await buscar(id);
  await banner.destroy();
  vaciarCache();
}
