import { Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useBannersVigentes } from "../../hooks/use_banners.js";
import { brandConfig } from "../../../proyecto/config/brand_config.js";
import { HOME_TIENDA } from "../../../proyecto/config/home_config.js";
import { tiendaActiva } from "../../../proyecto/modulos_activos.js";
import { pantallasActivas } from "../../../proyecto/pantallas_modulos.jsx";
import BannerCarrusel from "./banner_carrusel.jsx";

/**
 * Home de tienda (SIS-30): carrusel de promociones vigentes y, debajo, el inicio que aporta el
 * rubro (`InicioTienda` en pantallas_modulos.jsx), que trae su propia portada y productos. Sin
 * rubro, el core muestra el nombre de la tienda. Si los banners no cargan, no se muestra error:
 * el carrusel simplemente no aparece y la tienda se sigue viendo.
 */
export default function HomePage() {
  const { banners } = useBannersVigentes();
  const inicios = pantallasActivas.filter((pantallas) => pantallas.InicioTienda);

  return (
    <div className="kt-body min-h-screen bg-white text-(--kt-ink)">
      <BannerCarrusel banners={banners.carrusel} />

      {inicios.length > 0
        ? inicios.map(({ codigo, InicioTienda }) => (
          <Suspense key={codigo} fallback={null}><InicioTienda textos={HOME_TIENDA} /></Suspense>
        ))
        : <PortadaSinRubro conCarrusel={banners.carrusel.length > 0} />}
    </div>
  );
}

function PortadaSinRubro({ conCarrusel }) {
  return (
    <section className={`px-4 sm:px-6 ${conCarrusel ? "py-8" : "bg-linear-to-b from-(--kt-bg-soft) to-white py-16 sm:py-20"}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`kt-display font-bold leading-tight ${conCarrusel ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"}`}>
            {brandConfig.nombre}
          </h1>
          {brandConfig.tagline && <p className="mt-2 max-w-xl text-base text-(--kt-ink-soft) sm:text-lg">{brandConfig.tagline}</p>}
        </div>
        {tiendaActiva && (
          <Link
            to={tiendaActiva.catalogo}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-(--kt-accent-comercial) px-6 py-3 text-sm font-bold text-white transition hover:bg-(--kt-accent-comercial-hover) sm:self-auto"
          >
            Ver catálogo <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
