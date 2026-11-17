import { useState, useRef, useEffect, useCallback } from "react";
import { readGuestCart, guestItem, mergeGuestItems } from "./guest_storage.js";
const DEBOUNCE_MS = 400;

// Adapter: get, add, update, remove, clear, merge, product.
// Remontar el provider al cambiar de cuenta. Los borradores de cantidad se
// superponen al último snapshot confirmado; una respuesta nunca pisa otro borrador.
export function usePersistentCart({ userId, enabled, config, adapter }) {
  const [items, setItems] = useState(() => enabled ? readGuestCart(localStorage, config.storageKey, config.cartTtlDays)?.items ?? [] : []);
  const [loading, setLoading] = useState(!!userId && enabled);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(0);
  const itemsRef = useRef(items);
  const confirmed = useRef(items);
  const drafts = useRef(new Map());
  const timers = useRef(new Map());
  const version = useRef(0);
  const queue = useRef(Promise.resolve());
  const active = useRef(true);
  const ready = useRef(!userId);
  const redraw = useCallback(() => {
    const data = confirmed.current.map((item) => {
      const draft = drafts.current.get(String(item.item_id));
      return draft ? { ...item, cantidad: draft.quantity } : item;
    });
    if (active.current) { itemsRef.current = data; setItems(data); }
    return data;
  }, []);
  const publish = useCallback((data) => {
    if (!active.current) return data;
    confirmed.current = data;
    return redraw();
  }, [redraw]);
  const saveGuest = useCallback((data) => {
    if (!active.current) throw new Error("La sesión cambió. Volvé a intentar.");
    localStorage.setItem(config.storageKey, JSON.stringify({ key: crypto.randomUUID(), updatedAt: Date.now(), items: data }));
    return publish(data);
  }, [config, publish]);
  const enqueue = useCallback((action) => {
    setPending((n) => n + 1);
    const operation = queue.current.then(() => {
      if (!active.current) throw new Error("La sesión cambió.");
      return action();
    });
    queue.current = operation.catch(() => {});
    return operation.catch((e) => {
      if (active.current) setError(e.response?.data?.mensaje || e.message || "No pudimos guardar tu carrito.");
      throw e;
    }).finally(() => { if (active.current) setPending((n) => n - 1); });
  }, []);
  const commit = useCallback((key) => {
    key = String(key);
    const entry = timers.current.get(key);
    if (!entry) return Promise.resolve(itemsRef.current);
    clearTimeout(entry.timer);
    timers.current.delete(key);
    if (active.current) setPending((n) => n - 1);
    const operation = enqueue(async () => {
      try {
        const data = await adapter.update(entry.id, entry.quantity);
        if (drafts.current.get(key)?.version === entry.version) drafts.current.delete(key);
        return publish(data);
      } catch (e) {
        if (drafts.current.get(key)?.version === entry.version) drafts.current.delete(key);
        redraw();
        throw e;
      }
    });
    // Todos los callers del debounce finalizan, incluso si lo adelantó flush().
    operation.then(
      (data) => entry.waiters.forEach((w) => w.resolve(data)),
      (e) => entry.waiters.forEach((w) => w.reject(e)),
    );
    return operation;
  }, [adapter, enqueue, publish, redraw]);
  const cancelTimer = useCallback((key) => {
    key = String(key);
    const entry = timers.current.get(key);
    if (entry) {
      clearTimeout(entry.timer); timers.current.delete(key);
      entry.waiters.forEach((w) => w.resolve(itemsRef.current));
      if (active.current) setPending((n) => n - 1);
    }
    drafts.current.delete(key);
  }, []);
  const recargar = useCallback(() => enqueue(async () => {
    if (!enabled) return itemsRef.current;
    setError("");
    if (!userId) return itemsRef.current;
    const guest = readGuestCart(localStorage, config.storageKey, config.cartTtlDays);
    let data;
    if (guest?.items.length) {
      data = await adapter.merge({ key: guest.key, items: guest.items.map(({ producto_id, variedad_id, cantidad }) => ({ producto_id, variedad_id, cantidad })) });
      if (readGuestCart(localStorage, config.storageKey, config.cartTtlDays)?.key === guest.key) localStorage.removeItem(config.storageKey);
    } else data = await adapter.get();
    ready.current = true;
    return publish(data);
  }), [adapter, config, enabled, enqueue, publish, userId]);
  useEffect(() => {
    active.current = true;
    if (enabled && userId) recargar().catch(() => {}).finally(() => { if (active.current) setLoading(false); });
    const pendingTimers = timers.current;
    return () => {
      active.current = false;
      for (const entry of pendingTimers.values()) {
        clearTimeout(entry.timer);
        entry.waiters.forEach((w) => w.resolve([]));
      }
      pendingTimers.clear();
    };
  }, [enabled, userId, recargar]);
  const addItem = useCallback((payload) => enqueue(async () => {
    if (!enabled) throw new Error("El carrito no está disponible.");
    setError("");
    const { producto_id, variedad_id, cantidad = 1, producto: preview } = payload;
    if (userId && ready.current) return publish(await adapter.add({ producto_id, variedad_id, cantidad }));
    if (!config.guestCart || !config.publicCatalog) throw new Error("Ingresá para agregar productos.");
    // La card ya dispone de producto/presentaciones: el invitado no necesita otro GET.
    const product = preview || await adapter.product(producto_id);
    const variety = product.variedades?.find((v) => v.id === variedad_id);
    if (!variety) throw new Error("Esta presentación ya no está disponible.");
    return saveGuest(mergeGuestItems(itemsRef.current, guestItem(product, variety, cantidad), config.maxQuantity, config.maxCartLines));
  }), [adapter, config, enabled, enqueue, publish, saveGuest, userId]);
  const setCantidad = useCallback((id, quantity) => {
    const item = itemsRef.current.find((i) => i.item_id === id);
    if (!item) return Promise.resolve(itemsRef.current);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > config.maxQuantity || item.stock_disponible != null && quantity > item.stock_disponible) {
      const e = new Error("La cantidad supera la disponibilidad o el máximo permitido.");
      setError(e.message); return Promise.reject(e);
    }
    setError("");
    if (!(userId && ready.current)) return enqueue(() => saveGuest(itemsRef.current.map((i) => i.item_id === id ? { ...i, cantidad: quantity } : i)));
    const key = String(id);
    const previous = timers.current.get(key);
    const entry = { id, quantity, version: ++version.current, waiters: previous?.waiters || [] };
    if (previous) clearTimeout(previous.timer);
    else setPending((n) => n + 1);
    drafts.current.set(key, entry);
    redraw();
    const result = new Promise((resolve, reject) => entry.waiters.push({ resolve, reject }));
    entry.timer = setTimeout(() => { commit(key).catch(() => {}); }, DEBOUNCE_MS);
    timers.current.set(key, entry);
    return result;
  }, [commit, config, enqueue, redraw, saveGuest, userId]);
  const removeItem = useCallback((id) => {
    cancelTimer(id);
    return enqueue(async () => {
      setError("");
      if (userId && ready.current) return publish(await adapter.remove(id));
      return saveGuest(itemsRef.current.filter((i) => i.item_id !== id));
    });
  }, [adapter, cancelTimer, enqueue, publish, saveGuest, userId]);
  const clearCart = useCallback(() => {
    for (const key of [...timers.current.keys()]) cancelTimer(key);
    return enqueue(async () => {
      if (userId && ready.current) { await adapter.clear(); publish([]); }
      else saveGuest([]);
      setError("");
    });
  }, [adapter, cancelTimer, enqueue, publish, saveGuest, userId]);
  const flush = useCallback(async () => {
    await Promise.all([...timers.current.keys()].map(commit));
    await queue.current;
    if (userId && !ready.current) throw new Error("Primero recuperá o corregí tu carrito guardado.");
    return itemsRef.current;
  }, [commit, userId]);
  return { items, loading, error, pending, addItem, setCantidad, removeItem, clearCart, recargar, flush,
    cantidadItems: items.reduce((s, i) => s + i.cantidad, 0),
    total: items.reduce((s, i) => s + Math.round(i.precio * 100) * i.cantidad, 0) / 100,
  };
}
