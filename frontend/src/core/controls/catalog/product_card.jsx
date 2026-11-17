import { Link } from "react-router-dom";
import { Package, ShoppingBag, Tag } from "lucide-react";
import ActionButton from "../ui/action_button.jsx";
import StockBadge from "./stock_badge.jsx";

/**
 * Card de catálogo B2B (kiosco/almacén reordenando, no D2C de impulso) —
 * jerarquía pensada para escanear muchos SKU rápido, no para "enamorar" con
 * storytelling: 1) foto+marca para reconocer el producto de un vistazo
 * (en mayorista se compra por marca tanto como por producto), 2) precio como
 * ancla visual más fuerte de la card (tipografía de marca, no el nombre),
 * 3) stock como semáforo de color, no un texto más a leer, 4) oferta
 * (precio_anterior) si existe — dato que ya viaja del backend pero nadie
 * mostraba. El CTA usa --kt-accent-comercial, el tono que el sistema de
 * diseño ya reserva para "el punto exacto donde se convierte una venta"
 * (ver index.css) — antes usaba el mismo azul que cualquier link de admin.
 * Mismo criterio en el detalle de producto (ver producto_detalle_page.jsx).
 */

export default function ProductCard({
  name, brand, image, to, price, pricePrefix, previousPrice, discountPercent,
  presentation, stock, unavailable, onAdd, busy, message, error,
}) {
  return (
    <article className="kt-card group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-(--kt-border) bg-white shadow-sm">
      <Link to={to} className="kt-img-card relative flex aspect-square items-center justify-center overflow-hidden bg-(--kt-bg-soft)">
        {image
          ? <img src={image} alt={name} loading="lazy" decoding="async" className="h-full w-full object-contain p-3" />
          : <Package size={36} className="text-slate-300" />}
        {!!discountPercent && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-xs font-extrabold text-white shadow-sm">
            <Tag size={11} /> -{discountPercent}%
          </span>
        )}
        {unavailable && (
          <span className="absolute right-2 top-2 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-bold text-rose-700">Sin stock</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {brand && <p className="truncate text-[11px] font-extrabold uppercase tracking-wide text-(--kt-petrol)">{brand}</p>}
        <Link to={to} className="line-clamp-2 text-sm font-bold text-(--kt-ink) hover:underline">{name}</Link>
        {presentation && (
          <span className="w-fit rounded-md bg-(--kt-bg-soft) px-1.5 py-0.5 text-[11px] font-semibold text-(--kt-ink-soft)">{presentation}</span>
        )}

        <div className="mt-auto space-y-1.5 pt-2">
          {price ? (
            <div>
              {previousPrice && <p className="text-xs text-slate-400 line-through">{previousPrice}</p>}
              <p className="kt-display text-lg font-extrabold leading-tight text-(--kt-ink) sm:text-xl">
                {pricePrefix}{price}
              </p>
              <p className="text-[11px] text-(--kt-ink-soft)">IVA incluido</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-(--kt-ink-soft)">Consultá disponibilidad</p>
          )}

          <StockBadge stock={stock} />
        </div>

        {onAdd ? (
          <ActionButton
            onClick={onAdd} disabled={busy || unavailable}
            className={`w-full px-2! bg-(--kt-accent-comercial)! hover:bg-(--kt-accent-comercial-hover)! ${error ? "kt-shake" : ""}`}
          >
            <ShoppingBag size={16} key={message ? "added" : "idle"} className={message ? "kt-pop" : ""} />
            {unavailable ? "Sin stock" : busy ? "Agregando…" : "Agregar"}
          </ActionButton>
        ) : (
          <Link to={to} className="flex min-h-11 items-center justify-center rounded-xl border border-(--kt-border) px-2 text-sm font-semibold text-(--kt-ink)">Ver opciones</Link>
        )}
        {(message || error) && <p role={error ? "alert" : "status"} className={`text-xs ${error ? "text-rose-700" : "text-emerald-700"}`}>{error || message}</p>}
      </div>
    </article>
  );
}
