import { ESTADOS_INSCRIPCION, ESTADOS_PAGO_INSCRIPCION } from "../../../../../torneo_config.js";
import { formatearMomento } from "../../suscripcion/estado_plan.js";

// Excel en español usa ";" para separar columnas; el BOM hace que lea bien los acentos.
const SEPARADOR = ";";
const BOM = "﻿";

/**
 * Una celda segura: entre comillas (las comillas internas se duplican) y, si empieza con = + - @,
 * con un apóstrofo adelante para que Excel no la ejecute como fórmula (alguien podría anotarse
 * con un nombre armado a propósito).
 */
function celda(valor) {
  let texto = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

const COLUMNAS = [
  ["Categoría", (i, c) => c.nombre.get(i.categoria_id)],
  ["Jugador 1", (i) => i.jugador1_nombre],
  ["Jugador 2", (i) => i.jugador2_nombre],
  ["Teléfono", (i) => i.telefono],
  ["Estado", (i) => ESTADOS_INSCRIPCION[i.estado] ?? i.estado],
  ["Pago", (i, c) => (i.pago_estado ? ESTADOS_PAGO_INSCRIPCION[i.pago_estado] : c.monto.get(i.categoria_id) ? "Sin comprobante" : "No cobra por MiPadel")],
  ["Cabeza de serie", (i) => (i.cabeza_de_serie ? "Sí" : "")],
  ["Cómo se anotó", (i) => (i.origen === "online" ? "Online" : "Cargada por la organización")],
  ["Anotada el", (i) => formatearMomento(i.creado_en)],
  ["Nota", (i) => i.nota],
  ["Motivo de rechazo", (i) => i.motivo_rechazo],
];

/** Texto del archivo: una fila por inscripción, ordenadas por categoría (en el orden del torneo). */
export function inscripcionesACsv(inscripciones, categorias) {
  const ctx = { nombre: new Map(categorias.map((c) => [c.id, c.nombre])), monto: new Map(categorias.map((c) => [c.id, c.monto_inscripcion])) };
  const orden = new Map(categorias.map((c, i) => [c.id, i]));
  const filas = [...inscripciones].sort((a, b) => (orden.get(a.categoria_id) ?? 99) - (orden.get(b.categoria_id) ?? 99) || a.id - b.id);
  const lineas = [COLUMNAS.map(([titulo]) => celda(titulo)), ...filas.map((i) => COLUMNAS.map(([, valor]) => celda(valor(i, ctx))))];
  return BOM + lineas.map((l) => l.join(SEPARADOR)).join("\r\n");
}

/** Nombre de archivo sin caracteres raros: "inscriptos-copa-primavera.csv". */
export function nombreDeArchivo(torneo) {
  const base = torneo.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `inscriptos-${base || torneo.id}.csv`;
}

/** Descarga el archivo sin pasar por el servidor (los datos ya están en pantalla). */
export function descargarCsv(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const enlace = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
