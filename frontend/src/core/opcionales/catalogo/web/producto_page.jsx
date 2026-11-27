import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { brandConfig } from "../../../../proyecto/config/brand_config.js";
import { clientConfig } from "../../../../../../proyecto/client_config.js";
import Precio from "../../../controls/ui/precio.jsx";
import { BOTON_SECUNDARIO, BOTON_WHATSAPP } from "../../../controls/ui/estilos.js";
import { Cargando, ErrorReintentar } from "../../../controls/ui/estados_web.jsx";
import { linkWhatsapp } from "../../../utils/whatsapp.js";
import { compra } from "../compra.js";
import { useProducto } from "../hooks.js";
import Galeria from "./galeria.jsx";

export default function ProductoPage() {
  const { slug } = useParams();
  const consulta = useProducto(slug);
  const noExiste = [400, 404].includes(consulta.error?.response?.status);
  return (
    <div className="kt-body min-h-screen bg-white text-(--kt-ink)">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link to="/catalogo" className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Catálogo</Link>
        <div className="mt-3">
          {consulta.isPending ? <Cargando texto="Cargando el producto" />
            : noExiste ? (
              <div className="py-14 text-center">
                <h1 className="kt-display text-3xl font-bold">Este producto ya no está</h1>
                <Link to="/catalogo" className={`${BOTON_SECUNDARIO} mt-6`}>Ver el catálogo</Link>
              </div>
            )
              : consulta.isError ? <ErrorReintentar consulta={consulta} mensaje="No pudimos cargar el producto." />
                : <Ficha key={consulta.data.id} producto={consulta.data} />}
        </div>
      </div>
    </div>
  );
}

function Ficha({ producto }) {
  const { variantes, con_opciones } = producto;
  const [elegidaId, setElegidaId] = useState(() => (variantes.find((v) => v.disponible) ?? variantes[0]).id);
  // Si al refrescar la opción elegida ya no está, vuelve a la primera.
  const variante = variantes.find((v) => v.id === elegidaId) ?? variantes[0];
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Galeria fotos={producto.fotos} nombre={producto.nombre} />
      <div className="space-y-5">
        <div>
          <p className="text-(--kt-ink-soft)">
            {producto.categorias.map((c, i) => <span key={c.slug}>{i > 0 && " › "}<Link to={`/catalogo?categoria=${c.slug}`} className="hover:underline">{c.nombre}</Link></span>)}
          </p>
          <h1 className="kt-display mt-1 text-3xl font-bold sm:text-4xl">{producto.nombre}</h1>
        </div>
        {con_opciones && (
          <div role="group" aria-label="Opciones" className="flex flex-wrap gap-2">
            {variantes.map((v) => (
              <button key={v.id} type="button" aria-pressed={v.id === variante.id} onClick={() => setElegidaId(v.id)}
                className={`min-h-11 rounded-xl border px-4 font-semibold focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:outline-none ${v.id === variante.id ? "border-(--kt-teal-700) bg-(--kt-teal-700) text-white" : "border-(--kt-border) bg-white hover:border-(--kt-teal-700)"} ${v.disponible ? "" : "line-through opacity-70"}`}>
                {v.nombre}{!v.disponible && <span className="sr-only"> (sin stock)</span>}
              </button>
            ))}
          </div>
        )}
        <Precio monto={variante.precio} anterior={variante.precio_anterior} tamano="grande" />
        <p className={`font-semibold ${variante.disponible ? "text-emerald-700" : "text-(--kt-ink-soft)"}`}>{variante.disponible ? "Disponible" : "Sin stock por ahora"}</p>
        {compra && <compra.Ficha producto={producto} variante={variante} />}
        {clientConfig.whatsapp && (
          <a href={linkWhatsapp(clientConfig.whatsapp, consultaPor(producto, variante))} target="_blank" rel="noopener noreferrer" className={`${compra ? BOTON_SECUNDARIO : BOTON_WHATSAPP} w-full sm:w-auto`}>
            <MessageCircle size={20} aria-hidden="true" /> Consultar por WhatsApp
          </a>
        )}
        {producto.descripcion && <p className="max-w-prose whitespace-pre-line">{producto.descripcion}</p>}
        {variante.codigo && <p className="text-sm text-(--kt-ink-soft)">Código: {variante.codigo}</p>}
      </div>
    </div>
  );
}

const consultaPor = (producto, variante) => [
  `¡Hola ${brandConfig.nombre}! Quiero consultar por: ${producto.nombre}${producto.con_opciones ? ` (${variante.nombre})` : ""}.`,
  `${window.location.origin}/catalogo/${producto.slug}`,
].join("\n");
