import { useState } from "react";
import ProductCard from "../../../controls/catalog/product_card.jsx";
import { useCarritoDistribuidora } from "../carrito/carrito_context.jsx";
import { storefrontConfig as config } from "../../../config/storefront_config.js";
import { formatearPrecio } from "../utils/precio_iva.js";
import { describirBulto } from "../../../../../unidades_config.js";
export default function ProductoCard({ producto }) {
  const { addItem } = useCarritoDistribuidora();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const varieties = producto.variedades ?? [];
  const available = varieties.filter((v) => !v.controla_stock || v.cantidad > 0);
  const cheapest = [...(available.length ? available : varieties)].sort((a,b) => Number(a.precio) - Number(b.precio))[0];
  const single = varieties.length === 1;
  // precio_anterior es un dato de "oferta puntual" (ver producto_distribuidora_service.js)
  // que ya viaja del backend pero nadie lo mostraba en el catálogo.
  const previousPrice = cheapest?.precio_anterior && Number(cheapest.precio_anterior) > Number(cheapest.precio) ? Number(cheapest.precio_anterior) : null;
  const discountPercent = previousPrice ? Math.round((1 - Number(cheapest.precio) / previousPrice) * 100) : null;
  const stock = !cheapest ? null
    : !cheapest.controla_stock ? { tone: "unknown", label: config.labels.availability }
    : available.length ? { tone: "ok", label: `${cheapest.cantidad} disponibles` }
    : { tone: "out", label: "Sin stock" };
  const add = async () => {
    setBusy(true); setError(""); setMessage("");
    try { await addItem({ producto_id: producto.id, variedad_id: varieties[0].id, cantidad: 1, producto }); setMessage("Agregado al carrito"); }
    catch (e) { setError(e.response?.data?.mensaje || e.message || "No se pudo agregar. Intentá nuevamente."); }
    finally { setBusy(false); }
  };
  return <ProductCard name={producto.nombre} brand={producto.marca} image={producto.imagen_url}
    to={config.catalogPath + "/" + producto.id}
    price={cheapest ? formatearPrecio(cheapest.precio) : null}
    pricePrefix={!single && cheapest ? "Desde " : ""}
    previousPrice={previousPrice ? formatearPrecio(previousPrice) : null}
    discountPercent={discountPercent}
    presentation={single ? [varieties[0].nombre, describirBulto(varieties[0])].filter(Boolean).join(" · ") || "Unidad" : `${varieties.length} presentaciones`}
    stock={stock}
    unavailable={!available.length} onAdd={single ? add : undefined} busy={busy} message={message} error={error} />;
}
