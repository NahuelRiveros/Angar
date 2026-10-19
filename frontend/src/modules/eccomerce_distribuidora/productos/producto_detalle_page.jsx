import { useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Tag, ArrowLeft } from "lucide-react";
import { getProducto } from "../api/producto_distribuidora_api.js";
import { useAuth } from "../../../auth/auth_context.jsx";
import { useCarritoDistribuidora } from "../carrito/carrito_context.jsx";
import { storefrontConfig as config } from "../../../config/storefront_config.js";
import { formatearPrecio } from "../utils/precio_iva.js";
import { cantidadConUnidad, describirBulto, textoBultos } from "../../../../../unidades_config.js";
import StockBadge from "../../../controls/catalog/stock_badge.jsx";
import QuantityInput from "../../../controls/ui/quantity_input.jsx";
import ActionButton from "../../../controls/ui/action_button.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";

/**
 * Mismo criterio de marketing que la card del catálogo (ver product_card.jsx):
 * oferta y stock tienen que verse igual acá que en la card — antes un
 * producto con -33% mostraba el badge en la card y, al entrar al detalle,
 * la oferta desaparecía (no había precio tachado ni badge). Se suma el
 * subtotal al elegir cantidad (relevante en mayorista: alguien pidiendo 50
 * unidades quiere ver el total de esa línea, no solo el precio unitario) y
 * el aviso de "sin cobro al enviar" justo en el momento de decisión, no solo
 * en el carrito — reduce la fricción de "¿me van a cobrar ya?" antes de
 * apretar Agregar. Sin galería de fotos ni reseñas: el modelo de datos
 * tiene una sola imagen, y no hay reseñas reales que mostrar — fabricar
 * cualquiera de las dos sería sólo ruido visual, o directamente engañoso.
 */
function Detail({ product }) {
  const { addItem } = useCarritoDistribuidora();
  const [variantId, setVariantId] = useState(
    () => product.variedades?.find((v) => !v.controla_stock || v.cantidad > 0)?.id ?? product.variedades?.[0]?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const variant = product.variedades?.find((v) => v.id === variantId);
  const max = Math.min(config.maxQuantity, variant?.controla_stock ? variant.cantidad : config.maxQuantity);
  const previousPrice = variant?.precio_anterior && Number(variant.precio_anterior) > Number(variant.precio) ? Number(variant.precio_anterior) : null;
  const discountPercent = previousPrice ? Math.round((1 - Number(variant.precio) / previousPrice) * 100) : null;
  // Mayorista: se pide por unidad, pero conviene ver y sumar cajas completas.
  const porBulto = Number(variant?.unidades_por_bulto) || 1;
  const bulto = variant ? describirBulto(variant) : null;
  const siguienteBulto = (Math.floor(quantity / porBulto) + 1) * porBulto;
  const stock = !variant ? null
    : !variant.controla_stock ? { tone: "unknown", label: config.labels.availability }
    : max > 0 ? { tone: "ok", label: `${cantidadConUnidad(variant.cantidad, variant.unidad_medida)} disponibles` }
    : { tone: "out", label: "Sin stock" };

  return (
    <div className="grid gap-6 rounded-2xl border border-(--kt-border) bg-white p-4 sm:grid-cols-2 sm:p-6">
      <div className="kt-img-card relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-(--kt-bg-soft)">
        {product.imagen_url
          ? <img src={product.imagen_url} alt={product.nombre} className="h-full w-full object-contain p-4" />
          : <Package size={48} className="text-slate-300" />}
        {!!discountPercent && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-sm font-extrabold text-white shadow-sm">
            <Tag size={13} /> -{discountPercent}%
          </span>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        <div>
          {product.marca && <p className="text-xs font-extrabold uppercase tracking-wide text-(--kt-petrol)">{product.marca}</p>}
          <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">{product.nombre}</h1>
        </div>
        {product.descripcion && <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{product.descripcion}</p>}
        {!!product.variedades?.length && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Presentación</legend>
            <div className="flex flex-wrap gap-2">
              {product.variedades.map((v) => (
                <button
                  type="button" key={v.id} aria-pressed={variantId === v.id}
                  onClick={() => { setVariantId(v.id); setQuantity(1); setAdded(false); setError(""); }}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm ${variantId === v.id ? "border-(--kt-teal-700) bg-(--kt-turquoise-soft)" : "border-(--kt-border)"}`}
                >
                  {v.nombre || "Unidad"}{v.controla_stock && v.cantidad <= 0 ? " · Sin stock" : ""}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="space-y-1.5">
          {variant ? (
            <>
              {previousPrice && <p className="text-sm text-slate-400 line-through">{formatearPrecio(previousPrice)}</p>}
              <p className="kt-display text-3xl font-extrabold text-(--kt-ink)">{formatearPrecio(variant.precio)}</p>
              <p className="text-xs text-slate-500">{config.labels.priceNotice}</p>
              {bulto && <p className="text-sm text-(--kt-ink-soft)">{bulto} · Precio por {variant.unidad_bulto?.toLowerCase() ?? "bulto"}: <b className="text-(--kt-ink)">{formatearPrecio(variant.precio * porBulto)}</b></p>}
            </>
          ) : (
            <p className="text-lg font-semibold text-(--kt-ink-soft)">Consultá disponibilidad</p>
          )}
          <StockBadge stock={stock} className="mt-1" />
          {variant?.cod_ref && <p className="text-xs text-slate-500">Código: {variant.cod_ref}</p>}
        </div>

        {variant && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <QuantityInput value={quantity} onChange={setQuantity} max={max} disabled={busy || max < 1} />
              {bulto && (
                <button type="button" disabled={busy || siguienteBulto > max} onClick={() => setQuantity(siguienteBulto)}
                  className="min-h-11 rounded-xl border border-(--kt-turquoise-border) bg-(--kt-turquoise-soft) px-3 text-sm font-semibold text-(--kt-petrol) disabled:opacity-50">
                  +1 {variant.unidad_bulto?.toLowerCase() ?? "caja"}
                </button>
              )}
              {quantity > 1 && (
                <p className="text-sm text-(--kt-ink-soft)">Subtotal: <span className="font-bold text-(--kt-ink)">{formatearPrecio(variant.precio * quantity)}</span></p>
              )}
            </div>
            {bulto && quantity > 0 && <p className="text-sm text-(--kt-ink-soft)">= {textoBultos(quantity, variant)}</p>}
            <ActionButton
              disabled={busy || max < 1}
              className={`bg-(--kt-accent-comercial)! hover:bg-(--kt-accent-comercial-hover)! ${error ? "kt-shake" : ""}`}
              onClick={async () => {
                setBusy(true); setError(""); setAdded(false);
                try { await addItem({ producto_id: product.id, variedad_id: variant.id, cantidad: quantity, producto: product }); setAdded(true); }
                catch (e) { setError(e.response?.data?.mensaje || e.message); } finally { setBusy(false); }
              }}
            >
              <ShoppingBag size={16} key={added ? "added" : "idle"} className={added ? "kt-pop" : ""} />
              {busy ? "Agregando…" : "Agregar al carrito"}
            </ActionButton>
            <p className="text-xs text-(--kt-ink-soft)">{config.labels.orderNotice}</p>
          </div>
        )}
        <ErrorBanner message={error} />
        {added && (
          <p role="status" className="text-sm text-emerald-700">
            Agregado. <Link to={config.cartPath} className="font-bold underline">Ver carrito</Link>
          </p>
        )}
        {!variant && (
          <Link to="/#contacto" className="inline-block min-h-11 py-3 font-semibold underline">Consultar este producto</Link>
        )}
      </div>
    </div>
  );
}
export default function ProductoDetalleDistribuidoraPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Logueado: se manda la sesión para que el servidor aplique la lista de precios de su localidad.
  const { isAuth, usuario } = useAuth();
  const query = useQuery({ queryKey: ["storefront", "product", usuario?.usuario_id ?? "visitante", id], queryFn: ({ signal }) => getProducto(id, { signal, publicAccess: config.publicCatalog && !isAuth }), staleTime: 30000 });
  // location.key === "default" pasa cuando se entró directo por URL (link
  // compartido, refresh) — ahí no hay historial propio para volver, así que
  // cae al catálogo en vez de dejar al navegador ir a otra página/afuera.
  const volver = () => (location.key !== "default" ? navigate(-1) : navigate(config.catalogPath));
  return <div className="bg-(--kt-bg-soft) px-3 py-6 sm:px-6"><div className="mx-auto max-w-5xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={volver} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-(--kt-turquoise-border) bg-(--kt-turquoise-soft) px-3.5 py-2 text-sm font-bold text-(--kt-petrol) transition hover:bg-(--kt-turquoise-border)">
        <ArrowLeft size={16} /> Volver
      </button>
      <nav aria-label="Ubicación" className="flex flex-wrap gap-2 text-sm"><Link to={config.catalogPath} className="min-h-11 py-3 font-semibold underline">Productos</Link>
        {query.data?.categoria && <Link to={config.catalogPath + "?categoria=" + query.data.categoria.id} className="min-h-11 py-3">/ {query.data.categoria.nombre}</Link>}</nav>
    </div>
    {query.isPending ? <AdminSpinner /> : query.isError ? <><ErrorBanner message={query.error.response?.status === 404 ? "Este producto ya no está disponible." : "No pudimos cargar el producto."} /><ActionButton onClick={() => query.refetch()}>Reintentar</ActionButton></> : <Detail key={id} product={query.data} />}
  </div></div>;
}
