import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgePercent } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { storefrontConfig as config } from "../../../config/storefront_config.js";
import { getOfertas } from "../api/producto_distribuidora_api.js";
import HomeCarousel from "../../home/home_carousel.jsx";
import ProductoCard from "../productos/producto_card.jsx";

const LIMITE = 12;

/**
 * Carrusel de ofertas del home (mayor descuento primero), con los precios de la
 * lista de quien mira. Si no hay ofertas, o el catálogo es solo para clientes y
 * no hay sesión, no se muestra nada: el home nunca queda con un hueco vacío.
 */
export default function OfertasDestacadas() {
  const { isAuth, usuario } = useAuth();
  const puedeVer = config.publicCatalog || isAuth;
  const ofertas = useQuery({
    queryKey: ["storefront", "ofertas", usuario?.usuario_id ?? "visitante"],
    queryFn: ({ signal }) => getOfertas({ limite: LIMITE }, { signal, publicAccess: config.publicCatalog && !isAuth }),
    enabled: puedeVer, staleTime: 60_000,
  });
  const productos = Array.isArray(ofertas.data?.data) ? ofertas.data.data : [];
  if (!puedeVer || ofertas.isError || (ofertas.isSuccess && productos.length === 0)) return null;

  return (
    <section aria-labelledby="home-ofertas" className="bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-(--kt-teal-700) uppercase"><BadgePercent size={16} aria-hidden="true" /> Ofertas</p>
            <h2 id="home-ofertas" className="kt-display mt-1 text-2xl font-bold text-(--kt-ink) sm:text-3xl">Aprovechá los precios de esta semana</h2>
            {ofertas.data?.lista_precio && <p className="mt-1 text-sm text-slate-600">Precios para tu zona: {ofertas.data.lista_precio}</p>}
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
