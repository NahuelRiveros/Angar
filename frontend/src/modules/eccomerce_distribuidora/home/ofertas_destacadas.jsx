import { Link } from "react-router-dom";
import { ArrowRight, BadgePercent } from "lucide-react";
import { storefrontConfig as config } from "../../../config/storefront_config.js";
import HomeCarousel from "../../home/home_carousel.jsx";
import TrazoAnimado from "../../home/trazo_animado.jsx";
import ProductoCard from "../productos/producto_card.jsx";

// La portada y esta sección comparten una consulta en HomeTienda.
export default function OfertasDestacadas({ ofertas }) {
  const productos = Array.isArray(ofertas.data?.data) ? ofertas.data.data : [];
  if (ofertas.isError || (ofertas.isSuccess && productos.length === 0)) return null;

  return (
    <section aria-labelledby="home-ofertas" id="ofertas" className="border-y border-(--kt-accent-comercial)/15 bg-(--kt-warning-bg) px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-(--kt-accent-comercial) uppercase"><BadgePercent size={16} aria-hidden="true" /> Ofertas</p>
            <h2 id="home-ofertas" className="kt-display mt-1 text-2xl font-bold text-(--kt-ink) sm:text-3xl">Ofertas para aprovechar</h2>
            {ofertas.data?.lista_precio && <p className="mt-1 text-sm text-slate-600">Precios para tu zona: {ofertas.data.lista_precio}</p>}
            </div>
            <TrazoAnimado ofertas />
          </div>
          <Link to={`${config.catalogPath}?oferta=1`} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-(--kt-teal-700) underline-offset-4 hover:underline">
            Ver todas las ofertas <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {ofertas.isPending
          ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true" aria-label="Cargando ofertas">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          : <HomeCarousel items={productos} anchoItem="w-[70%] sm:w-[40%] lg:w-[23%]" renderItem={(p) => <ProductoCard producto={p} />} />}
      </div>
    </section>
  );
}
