import { itemVisible } from "../../controls/layout/navbar/navbar_permissions.js";

/**
 * Ayuda del panel (AYU-01 a AYU-09): solo datos y reglas, sin pantallas (lo prueban los tests de Node).
 *
 * Un tema: { id, grupo, titulo, resumen, palabras?, reglas?, pantalla?, acceso?, relacionados?, secciones }.
 * Una sección: { titulo, texto? (uno o varios párrafos), pasos?, ejemplo?, consejo?, problemas?: [{ problema, solucion }],
 * pantalla?, acceso? }.
 * Quién lo ve (AYU-04): `pantalla` = la misma regla que el ítem del menú con ese `to` (si el ítem no existe en
 * esta instalación, el tema no se muestra); `acceso` = { roles, permisos, todosLosPermisos } propio; sin ninguno,
 * todo el que entra al panel. Siempre hace falta, además, poder entrar al panel.
 */
export const GRUPOS_AYUDA = ["Primeros pasos", "Catálogo", "Precios", "Pedidos y cobros", "Clientes", "Personal y permisos", "Respaldo"];

const aplanar = (items) => (items ?? []).flatMap((item) => [item, ...aplanar(item.children)]);

/** Los ítems de menú del panel por dirección, para resolver `pantalla`. */
export function itemsPorPantalla(grupos) {
  return new Map(aplanar(grupos.flatMap((g) => g.items ?? [])).filter((i) => i.to).map((i) => [i.to, i]));
}

// Con `pantalla` y `acceso` juntos hacen falta los dos (ej.: el ajuste masivo vive en Artículos y pide además precios).
function puedeVer(requisito, usuario, contexto) {
  if (requisito.pantalla) {
    const item = contexto.items.get(requisito.pantalla);
    if (!item || !itemVisible(item, usuario)) return false;
  }
  return !requisito.acceso || itemVisible({ requiereAuth: true, ...requisito.acceso }, usuario);
}

/**
 * AYU-04: los temas que esta persona puede ver, con solo sus secciones visibles y "Relacionado" apuntando a temas
 * visibles. `contexto`: { items (itemsPorPantalla), accesoPanel }.
 */
export function temasVisibles(temas, usuario, contexto) {
  if (!usuario || !itemVisible({ requiereAuth: true, ...contexto.accesoPanel }, usuario)) return [];
  const visibles = temas.filter((t) => puedeVer(t, usuario, contexto));
  const ids = new Set(visibles.map((t) => t.id));
  return visibles.map((t) => ({
    ...t,
    secciones: (t.secciones ?? []).filter((s) => puedeVer(s, usuario, contexto)),
    relacionados: (t.relacionados ?? []).filter((id) => ids.has(id)),
  }));
}

export const normalizar = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todo el texto de un tema (lo que ya se filtró por acceso), para el buscador. */
export function textoDelTema(tema) {
  const deSeccion = (s) => [s.titulo, ...[s.texto ?? []].flat(), s.ejemplo, s.consejo, ...(s.pasos ?? []), ...(s.problemas ?? []).flatMap((p) => [p.problema, p.solucion])];
  return normalizar([tema.titulo, tema.resumen, tema.grupo, ...(tema.palabras ?? []), ...(tema.secciones ?? []).flatMap(deSeccion)].filter(Boolean).join(" "));
}

/** AYU-02: cada palabra buscada tiene que aparecer, sin acentos ni mayúsculas. Primero los que la tienen en el título. */
export function buscarTemas(temas, consulta) {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (!palabras.length) return temas;
  const enTitulo = (t) => palabras.every((p) => normalizar(t.titulo).includes(p));
  return temas.filter((t) => palabras.every((p) => textoDelTema(t).includes(p)))
    .sort((a, b) => Number(enTitulo(b)) - Number(enTitulo(a)));
}

/** Temas en el orden de GRUPOS_AYUDA; un grupo desconocido va al final. */
export function agruparTemas(temas) {
  const orden = (g) => (GRUPOS_AYUDA.includes(g) ? GRUPOS_AYUDA.indexOf(g) : GRUPOS_AYUDA.length);
  const grupos = [...new Set(temas.map((t) => t.grupo))].sort((a, b) => orden(a) - orden(b));
  return grupos.map((grupo) => ({ grupo, temas: temas.filter((t) => t.grupo === grupo) }));
}
