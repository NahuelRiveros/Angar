import { useSyncExternalStore } from "react";

// MPE-01: el carrito vive en el navegador (30 días) y no usa tablas. Cada línea guarda lo que se vio
// al agregarla; el precio que vale es el del servidor al enviar (MPE-02).
const CLAVE = "tienda_carrito";
const DIAS = 30;
export const MAX_LINEAS = 50;
export const MAX_CANTIDAD = 99;

const valida = (l) => Number.isInteger(l?.variante_id) && Number.isInteger(l.cantidad) && l.cantidad >= 1 && l.cantidad <= MAX_CANTIDAD && typeof l.producto === "string";

export function leerCarrito(almacen = localStorage, ahora = Date.now()) {
  try {
    const guardado = JSON.parse(almacen.getItem(CLAVE));
    if (!guardado || !Array.isArray(guardado.items) || ahora - guardado.actualizado > DIAS * 86400000) return [];
    return guardado.items.filter(valida).slice(0, MAX_LINEAS);
  } catch {
    return [];
  }
}

let items = typeof localStorage === "undefined" ? [] : leerCarrito();
const oyentes = new Set();
const avisar = () => oyentes.forEach((oyente) => oyente());

function guardar(nuevos) {
  items = nuevos;
  try { localStorage.setItem(CLAVE, JSON.stringify({ actualizado: Date.now(), items })); } catch { /* sin lugar o modo privado: queda en memoria */ }
  avisar();
}

// Otra pestaña cambió el carrito: se ve igual en todas.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (evento) => {
    if (evento.key !== CLAVE) return;
    items = leerCarrito();
    avisar();
  });
}

function suscribir(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Suma la línea o, si ya estaba, la cantidad. `linea`: { variante_id, producto, opcion, precio, foto, slug }. */
export function agregar(linea, cantidad = 1) {
  const previa = items.find((l) => l.variante_id === linea.variante_id);
  if (!previa && items.length >= MAX_LINEAS) throw new Error(`Tu carrito llegó a ${MAX_LINEAS} productos distintos.`);
  const total = Math.min((previa?.cantidad ?? 0) + cantidad, MAX_CANTIDAD);
  const nueva = { ...linea, cantidad: total };
  guardar(previa ? items.map((l) => (l.variante_id === linea.variante_id ? nueva : l)) : [...items, nueva]);
}

export const cambiarCantidad = (variante_id, cantidad) => guardar(items.map((l) => (l.variante_id === variante_id ? { ...l, cantidad: Math.max(1, Math.min(MAX_CANTIDAD, cantidad)) } : l)));
export const quitar = (variante_id) => guardar(items.filter((l) => l.variante_id !== variante_id));
export const vaciar = () => guardar([]);

/** MPE-03: lo que avisó el servidor. Saca lo que ya no se vende y pone el precio nuevo. */
export function aplicarCambios(cambios) {
  const porId = new Map(cambios.map((c) => [c.variante_id, c]));
  guardar(items.filter((l) => porId.get(l.variante_id)?.tipo !== "no_disponible")
    .map((l) => (porId.get(l.variante_id)?.tipo === "precio" ? { ...l, precio: porId.get(l.variante_id).precio } : l)));
}

const centavos = (precio) => Math.round(Number(precio) * 100);

export function useCarrito() {
  const lineas = useSyncExternalStore(suscribir, () => items, () => items);
  return {
    items: lineas,
    unidades: lineas.reduce((suma, l) => suma + l.cantidad, 0),
    total: lineas.reduce((suma, l) => suma + centavos(l.precio) * l.cantidad, 0) / 100,
  };
}
