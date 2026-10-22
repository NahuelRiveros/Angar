import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/auth_context.jsx";
import { useCarritoDistribuidora } from "./carrito_context.jsx";
import { storefrontConfig as config } from "../../../config/storefront_config.js";
import { authLink } from "../../../controls/acceso/return_to.js";
import CartItem from "../../../controls/carrito/cart_item.jsx";
import ActionButton from "../../../controls/ui/action_button.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import { getMiPerfil } from "../api/perfil_cliente_api.js";
import { enviarNotaPedido } from "../api/nota_pedido_api.js";
import { formatearPrecio as fmt } from "../utils/precio_iva.js";
import PerfilFormModal from "./perfil_form_modal.jsx";
import PagoTransferencia from "../pedidos/pago_transferencia.jsx";
function readAttempt(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } }
const ETIQUETAS_DESCUENTO = { zona: "Precio especial en tu zona", oferta: "Oferta" };
export default function NotaPedidoPage() {
  const cart = useCarritoDistribuidora();
  const queryClient = useQueryClient();
  const { isAuth, usuario } = useAuth();
  const navigate = useNavigate();
  const notesKey = config.storageKey + ":notes:" + (usuario?.usuario_id ?? "guest");
  const attemptKey = config.storageKey + ":order:" + (usuario?.usuario_id ?? "guest");
  const [notes, setNotes] = useState(() => sessionStorage.getItem(notesKey) ?? sessionStorage.getItem(config.storageKey + ":notes:guest") ?? "");
  const [attempt, setAttempt] = useState(() => readAttempt(attemptKey));
  const [search, setSearch] = useState("");
  const [review, setReview] = useState(null);
  const [editProfile, setEditProfile] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const [comprobantesEnviados, setComprobantesEnviados] = useState([]);
  const profile = useQuery({ queryKey: ["delivery-profile", usuario?.usuario_id], queryFn: getMiPerfil, enabled: isAuth });
  // El servidor decide si alcanza para pedir (misma regla que al enviar la nota).
  const complete = profile.data?.completo === true;
  const blocked = cart.items.some((i) => !i.activo || !i.variante_disponible || i.stock_disponible != null && i.cantidad > i.stock_disponible);
  const act = (operation) => operation.catch(() => {}); // El contexto muestra el error persistente.
  async function prepare() {
    if (!isAuth) { sessionStorage.setItem(notesKey, notes); navigate(authLink("/login", config.cartPath)); return; }
    setBusy(true); setError("");
    try {
      await cart.flush();
      if (cart.error) throw new Error("Corregí o actualizá tu carrito antes de continuar.");
      if (!complete) { setEditProfile(true); return; }
      const fresh = await cart.recargar();
      const expectedItems = fresh.map(({ item_id, cantidad, precio }) => ({ item_id, cantidad, precio }));
      setReview({ key: crypto.randomUUID(), notas: notes.trim() || null, expectedItems, items: fresh });
    } catch (e) { setError(e.response?.data?.mensaje || e.message); }
    finally { setBusy(false); }
  }
  async function send(payload) {
    if (busy) return;
    setBusy(true); setError("");
    const saved = { key: payload.key, notas: payload.notas, expectedItems: payload.expectedItems };
    sessionStorage.setItem(attemptKey, JSON.stringify(saved)); setAttempt(saved);
    try {
      const r = await enviarNotaPedido(saved.notas, saved.expectedItems, saved.key);
      setSent(r.data); setReview(null); setAttempt(null);
      sessionStorage.removeItem(attemptKey); sessionStorage.removeItem(notesKey); sessionStorage.removeItem(config.storageKey + ":notes:guest");
      await cart.recargar();
    } catch (e) {
      setReview(null); setError(e.response?.data?.mensaje || "No pudimos confirmar la respuesta. Reintentá el mismo envío para consultar su resultado sin duplicarlo.");
      if (e.response && e.response.status < 500) {
        setAttempt(null); sessionStorage.removeItem(attemptKey);
        await cart.recargar().catch(() => {});
      }
    } finally { setBusy(false); }
  }
  if (sent) return <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center"><h1 className="text-3xl font-bold">¡Pedido #{sent.id} enviado!</h1>
    <p>Total: {fmt(sent.total)}</p><p className="text-sm text-slate-600">{config.labels.orderNotice}</p>
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><PagoTransferencia datosAbiertos nota={{ estado: "pendiente", estado_pago: "pendiente", monto_pagado: 0, ...sent }} comprobantes={comprobantesEnviados} onSubido={(c) => setComprobantesEnviados((previos) => [...previos, c])} /></div>
    <Link to={config.ordersPath} className="block rounded-xl bg-(--kt-teal-700) p-3 font-bold text-white">Ver mis pedidos</Link><Link to={config.catalogPath} className="block py-3 underline">Seguir comprando</Link></div>;
  // Ahorro visible: precio de zona más barato que la General, y ofertas.
  const ahorro = (motivo) => cart.items.filter((i) => i.descuento === motivo && Number(i.precio_referencia) > Number(i.precio))
    .reduce((s, i) => s + (Number(i.precio_referencia) - Number(i.precio)) * i.cantidad, 0);
  const ahorroZona = ahorro("zona");
  const ahorroOfertas = ahorro("oferta");
  const filtered = cart.items.filter((i) => (i.nombre + " " + (i.variante ?? "")).toLowerCase().includes(search.toLowerCase()));
  return <div className="bg-(--kt-bg-soft) px-3 py-6 sm:px-6"><div className="mx-auto max-w-6xl space-y-5">
    <div><h1 className="kt-display text-3xl font-bold">Tu carrito</h1><p className="mt-1 text-sm text-slate-600">{cart.items.length} productos · {cart.cantidadItems} unidades</p></div>
    {!isAuth && <p className="rounded-xl border border-(--kt-border) bg-white p-4 text-sm">Armá tu carrito. Al continuar podés ingresar o crear una cuenta para enviar el pedido.</p>}
    <ErrorBanner message={error || cart.error} />
    {cart.alertas.preciosActualizados.length > 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Se actualizaron precios desde que agregaste productos. Revisá los importes antes de confirmar.</p>}
    {cart.error && <div className="flex flex-wrap gap-3"><ActionButton onClick={() => act(cart.recargar())}>Reintentar sincronización</ActionButton><p className="text-sm">Si un producto ya no está disponible, quitálo y reintentá.</p></div>}
    {attempt && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="mb-3 text-sm">Hay un envío pendiente de confirmar.</p><ActionButton disabled={busy} onClick={() => send(attempt)}>Consultar o reintentar envío</ActionButton></div>}
    {cart.loading ? <p role="status">Recuperando tu carrito…</p> : !cart.items.length ? <div className="rounded-2xl border border-dashed p-10 text-center"><p>Tu carrito está vacío.</p><Link to={config.catalogPath} className="mt-3 inline-block min-h-11 rounded-xl bg-(--kt-teal-700) px-4 py-3 font-bold text-white">Ver productos</Link></div> :
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Productos del carrito" className="space-y-3">
        {cart.items.length > 8 && <InputField name="cart-search" label="Buscar en el carrito" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />}
        {filtered.map((item) => <CartItem key={item.item_id} item={item} to={config.catalogPath + "/" + item.producto_id} formatPrice={fmt} maxQuantity={config.maxQuantity}
          etiquetaDescuento={ETIQUETAS_DESCUENTO[item.descuento]}
          disabled={busy || !!attempt} onQuantity={(q) => act(cart.setCantidad(item.item_id, q))} onRemove={() => act(cart.removeItem(item.item_id))} />)}
        {!filtered.length && <p className="p-4 text-sm">No encontramos productos con ese nombre en tu carrito.</p>}
        <button type="button" disabled={busy || !!attempt} onClick={() => setClearOpen(true)} className="min-h-11 px-3 text-sm text-rose-700 underline">Vaciar carrito</button>
      </section>
      <aside className="space-y-4 self-start rounded-2xl border border-(--kt-border) bg-white p-5 lg:sticky lg:top-20">
        <h2 className="text-lg font-bold">Resumen del pedido</h2><div className="flex justify-between text-xl font-bold"><span>Total</span><span>{fmt(cart.total)}</span></div>
        {(ahorroZona > 0 || ahorroOfertas > 0) && <div className="space-y-1 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {ahorroZona > 0 && <p>Ahorrás {fmt(ahorroZona)} con los precios de tu zona</p>}
          {ahorroOfertas > 0 && <p>Ahorrás {fmt(ahorroOfertas)} en ofertas</p>}
        </div>}
        <p className="text-xs text-slate-500">{config.labels.priceNotice}</p>
        <label className="block text-sm font-semibold" htmlFor="order-notes">Notas para el pedido (opcional)</label>
        <textarea id="order-notes" value={notes} maxLength={2000} disabled={busy || !!attempt} onChange={(e) => { setNotes(e.target.value); sessionStorage.setItem(notesKey, e.target.value); }} rows={3} className="w-full rounded-xl border border-(--kt-border) p-3 text-sm" placeholder="Ejemplo: horario para recibir la entrega" />
        {isAuth && <div className="space-y-2 border-t border-(--kt-border) pt-3"><h3 className="text-sm font-bold">Entrega</h3>
          {profile.isPending ? <p className="text-sm">Cargando datos…</p> : profile.isError ? <button onClick={() => profile.refetch()} className="text-sm underline">No se pudieron cargar tus datos. Reintentar</button>
            : <>{complete && <p className="text-sm font-semibold">{profile.data.nombre} {profile.data.apellido} · {profile.data.celular}</p>}
              <p className="text-sm text-slate-600">{complete ? `${profile.data.direccion}, ${profile.data.localidad}, ${profile.data.provincia}` : "Completá tus datos antes de enviar."}</p>
              <button type="button" disabled={busy} onClick={() => setEditProfile(true)} className="min-h-11 text-sm font-semibold underline">{complete ? "Editar datos" : "Completar datos"}</button></>}
        </div>}
        {blocked && <p role="alert" className="text-sm text-rose-700">Revisá los productos sin disponibilidad antes de continuar.</p>}
        <p role="status" className="text-xs text-slate-500">{cart.pending ? "Guardando cambios…" : config.labels.orderNotice}</p>
        <ActionButton className="w-full" disabled={busy || !!attempt || blocked || cart.pending > 0 || (isAuth && (profile.isPending || profile.isError))} onClick={prepare}>{busy ? "Preparando…" : config.labels.checkout}</ActionButton>
        <Link to={config.catalogPath} className="block min-h-11 py-3 text-center text-sm font-semibold underline">Seguir comprando</Link>
      </aside>
    </div>}
    {editProfile && <PerfilFormModal perfil={profile.data} onClose={() => setEditProfile(false)} onGuardado={async () => {
      // La localidad define la lista de precios: se recargan los precios del carrito y, si cambiaron, se avisa arriba.
      await Promise.all([profile.refetch(), cart.recargar().catch(() => {}), queryClient.invalidateQueries({ queryKey: ["storefront"] })]); setEditProfile(false);
    }} />}
    {clearOpen && <Modal title="¿Vaciar tu carrito?" onClose={() => setClearOpen(false)}><p className="mb-4 text-sm">Se quitarán los productos seleccionados.</p><ActionButton onClick={async () => { await act(cart.clearCart()); setClearOpen(false); }}>Vaciar carrito</ActionButton></Modal>}
    {review && <Modal title="Revisá y confirmá tu pedido" busy={busy} onClose={() => setReview(null)}>
      <div className="space-y-4"><p className="text-sm">{profile.data?.direccion}, {profile.data?.localidad}, {profile.data?.provincia}</p>
        <ul className="space-y-2">{review.items.map((i) => <li key={i.item_id} className="text-sm">{i.cantidad} × {i.nombre} {i.variante ? "· " + i.variante : ""} — {fmt(i.precio * i.cantidad)}</li>)}</ul>
        <p className="text-lg font-bold">Total: {fmt(review.items.reduce((s,i) => s + Math.round(i.precio * 100) * i.cantidad, 0) / 100)}</p>
        <p className="text-sm text-slate-600">{config.labels.orderNotice}</p>
        <ActionButton disabled={busy} className="w-full" onClick={() => send(review)}>{busy ? "Enviando…" : config.labels.confirmation}</ActionButton>
      </div>
    </Modal>}
  </div></div>;
}
