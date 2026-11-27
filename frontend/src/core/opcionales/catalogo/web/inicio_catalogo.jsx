import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { brandConfig } from "../../../../proyecto/config/brand_config.js";
import { BOTON_COMPRA } from "../../../controls/ui/estilos.js";
import { useDestacados } from "../hooks.js";
import Tarjeta from "./tarjeta.jsx";

/** Inicio de la tienda: portada y destacados. Si los destacados no cargan, la portada se ve igual. */
export default function InicioCatalogo() {
  const { data: destacados = [] } = useDestacados();
  return (
    <>
      <section className="bg-linear-to-b from-(--kt-bg-soft) to-white py-14 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 sm:px-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="kt-display text-4xl leading-tight font-bold sm:text-5xl">{brandConfig.nombre}</h1>
            {brandConfig.tagline && <p className="mt-2 max-w-xl text-lg text-(--kt-ink-soft)">{brandConfig.tagline}</p>}
          </div>
          <Link to="/catalogo" className={BOTON_COMPRA}>Ver catálogo <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>
      {destacados.length > 0 && (
        <section aria-labelledby="destacados" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h2 id="destacados" className="kt-display mb-5 text-2xl font-bold sm:text-3xl">Destacados</h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{destacados.map((p) => <li key={p.id} className="grid"><Tarjeta producto={p} /></li>)}</ul>
        </section>
      )}
    </>
  );
}
