import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, Package, BadgePercent, ShoppingBasket, Wine, Sparkles, Cookie, Dog, Snowflake, LayoutGrid } from "lucide-react";
import { useAuth } from "../../auth/auth_context.jsx";
import { brandConfig } from "../../config/brand_config.js";
import { HOME_TIENDA, HOME_VALOR } from "../../config/home_config.js";
import { storefrontConfig as config } from "../../config/storefront_config.js";
import { getProductos, getOfertas } from "../eccomerce_distribuidora/api/producto_distribuidora_api.js";
import { getCategorias } from "../eccomerce_distribuidora/api/categoria_distribuidora_api.js";
import ProductoCard from "../eccomerce_distribuidora/productos/producto_card.jsx";
import OfertasDestacadas from "../eccomerce_distribuidora/home/ofertas_destacadas.jsx";

import TrazoAnimado from "./trazo_animado.jsx";

const iconosFamilia = [
  [/almac[eé]n/i, ShoppingBasket], [/bebida|vino|cerveza/i, Wine],
  [/limpieza|perfumer[ií]a/i, Sparkles], [/galletita|golosina/i, Cookie],
  [/mascota/i, Dog], [/congelado|l[aá]cteo|helado/i, Snowflake],
];

function FotoProducto({ producto }) {
  const [fallo, setFallo] = useState(false);
  return producto.imagen_url && !fallo
    ? <img src={producto.imagen_url} alt={producto.nombre} onError={() => setFallo(true)} className="h-full w-full object-contain p-3" decoding="async" />
    : <Package size={40} aria-hidden="true" className="text-(--kt-petrol)" />;
}

export default function HomeTienda({ texto, textos }) {
  const navigate = useNavigate();
  const { isAuth, usuario } = useAuth();
  const puedeVer = config.enabled && (config.publicCatalog || isAuth);
  const visitante = usuario?.usuario_id ?? "visitante";
  const productos = useQuery({
    queryKey: ["home", "productos", visitante],
    queryFn: ({ signal }) => getProductos({ pagina: 1, por_pagina: 8 }, { signal, publicAccess: config.publicCatalog && !isAuth }),
    enabled: puedeVer, staleTime: 60_000,
  });
  const categorias = useQuery({
    queryKey: ["home", "categorias", visitante], queryFn: () => getCategorias(),
    enabled: puedeVer, staleTime: 5 * 60_000,
  });
  // Una consulta alimenta la portada y el carrusel con la misma lista de precios.
  const ofertas = useQuery({
    queryKey: ["storefront", "ofertas", visitante],
    queryFn: ({ signal }) => getOfertas({ limite: 12 }, { signal, publicAccess: config.publicCatalog && !isAuth }),
    enabled: puedeVer, staleTime: 60_000,
  });
  const lista = Array.isArray(productos.data?.data) ? productos.data.data.filter((p) => p.activo !== false && p.variedades?.some((v) => v.precio != null)) : [];
  const promociones = !ofertas.isError && Array.isArray(ofertas.data?.data) ? ofertas.data.data : [];
  const hayOfertas = puedeVer && promociones.length > 0;
  const familias = (Array.isArray(categorias.data) ? categorias.data : []).filter((c) => c.padre_id == null);
  const fotos = (hayOfertas ? promociones : lista).slice(0, 3);
  const destino = hayOfertas ? config.catalogPath + "?oferta=1" : config.catalogPath;
  const buscar = (event) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    navigate(config.catalogPath + (q ? "?" + new URLSearchParams({ q }) : ""));
  };

  return <>
    <section aria-labelledby="home-titulo" className="bg-(--kt-bg-soft) px-4 pb-7 pt-6 sm:px-6 sm:pt-8">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-(--kt-petrol) p-6 text-white sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border-[45px] border-white/5" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">{brandConfig.nombre} · {texto("hero_kicker", brandConfig.rubro)}</p>
            <h1 id="home-titulo" className="kt-display mt-5 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              {texto("hero_titulo", textos.hero_titulo)}
              <span className="block text-(--kt-accent-on-dark)">{texto("hero_titulo_resaltado", textos.hero_titulo_resaltado)}</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">{texto("hero_subtitulo", textos.hero_subtitulo)}</p>
            {config.enabled && <form role="search" aria-label="Buscar en el catálogo" onSubmit={buscar} className="mt-7 flex min-w-0 items-center gap-2 rounded-xl bg-white p-1.5 text-(--kt-ink) focus-within:ring-2 focus-within:ring-(--kt-turquoise)">
              <Search size={19} aria-hidden="true" className="ml-2 hidden shrink-0 text-(--kt-ink-soft) sm:block" />
              <label htmlFor="home-busqueda" className="sr-only">{config.labels.search}</label>
              <input id="home-busqueda" name="q" type="search" maxLength={160} placeholder={HOME_TIENDA.buscarPlaceholder} className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
              <button type="submit" className="flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-(--kt-accent-comercial) px-3 text-sm font-bold text-white hover:bg-(--kt-accent-comercial-hover)">Buscar</button>
            </form>}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              {config.enabled && <Link to={config.catalogPath} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline decoration-white/40 underline-offset-4 hover:decoration-white">{texto("hero_cta_primario", textos.hero_cta_primario)} <ArrowRight size={17} aria-hidden="true" /></Link>}
              <a href="#como-pedir" className="inline-flex min-h-11 items-center text-sm text-white/85 underline-offset-4 hover:underline">{texto("hero_cta_secundario", textos.hero_cta_secundario)}</a>
            </div>
          </div>
        </div>

        {config.enabled && <aside aria-label={hayOfertas ? "Promociones destacadas" : "Explorá el catálogo"} className="relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-(--kt-accent-comercial)/15 bg-(--kt-accent-comercial-soft) p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-(--kt-accent-comercial)">
            {hayOfertas ? <BadgePercent size={19} aria-hidden="true" /> : <ShoppingBasket size={19} aria-hidden="true" />}
            {hayOfertas ? HOME_TIENDA.promoEtiqueta : HOME_TIENDA.catalogoEtiqueta}
          </div>
          <h2 className="kt-display mt-3 max-w-sm text-3xl font-bold leading-tight tracking-tight text-(--kt-ink)">{hayOfertas ? HOME_TIENDA.promoTitulo : HOME_TIENDA.catalogoTitulo}</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-(--kt-ink-soft)">{hayOfertas ? HOME_TIENDA.promoTexto : HOME_TIENDA.catalogoTexto}</p>
          {fotos.length > 0
            ? <div className="my-5 flex min-h-28 items-center justify-center gap-2 sm:min-h-36">
                {fotos.map((p, i) => <Link key={p.id} to={config.catalogPath + "/" + p.id} aria-label={"Ver " + p.nombre}
                  className={`flex aspect-square min-w-0 max-w-36 flex-1 items-center justify-center rounded-2xl border border-(--kt-border) bg-white shadow-sm transition-transform hover:-translate-y-1 motion-reduce:transform-none ${i === 1 ? "-translate-y-2" : ""}`}>
                  <FotoProducto producto={p} />
                </Link>)}
              </div>
            : <div aria-hidden="true" className="my-5 flex h-28 items-center justify-center rounded-2xl border border-(--kt-accent-comercial)/15 bg-white/60"><ShoppingBasket size={64} strokeWidth={1.25} className="text-(--kt-accent-comercial)" /></div>}
          <Link to={destino} className="mt-auto inline-flex min-h-11 items-center justify-between gap-3 border-t border-(--kt-accent-comercial)/20 pt-4 text-sm font-bold text-(--kt-accent-comercial)">
            {hayOfertas ? HOME_TIENDA.promoCta : HOME_TIENDA.catalogoCta}<ArrowRight size={18} aria-hidden="true" />
          </Link>
        </aside>}
      </div>
      <div className="mx-auto mt-5 grid max-w-6xl grid-cols-2 gap-3 lg:grid-cols-4">
        {HOME_VALOR.map(({ icon, label }) => { const Icon = icon; return <div key={label} className="flex items-center gap-2 py-2 text-xs font-semibold text-(--kt-ink-soft)"><Icon size={18} className="shrink-0 text-(--kt-petrol)" aria-hidden="true" />{label}</div>; })}
      </div>
    </section>

    {puedeVer && <section aria-labelledby="home-familias" className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div><p className="text-xs font-bold uppercase tracking-widest text-(--kt-teal-700)">{HOME_TIENDA.familiasEtiqueta}</p><h2 id="home-familias" className="kt-display mt-2 text-2xl font-bold sm:text-3xl">{HOME_TIENDA.familiasTitulo}</h2></div>
            <TrazoAnimado />
          </div>
          <Link to={config.catalogPath} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-(--kt-petrol)">Ver todas <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {categorias.isPending ? <Esqueleto cantidad={6} />
          : categorias.isError ? <ErrorConsulta mensaje="No pudimos cargar las categorías." query={categorias} />
          : familias.length === 0 ? <p className="mt-4 text-sm text-(--kt-ink-soft)">Las categorías estarán disponibles próximamente.</p>
          : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {familias.slice(0, 6).map((f) => {
                const Icon = iconosFamilia.find(([patron]) => patron.test(f.nombre))?.[1] ?? LayoutGrid;
                return <Link key={f.id} to={config.catalogPath + "?categoria=" + f.id} className="group flex min-w-0 flex-col gap-4 rounded-2xl border border-(--kt-border) bg-white p-4 transition-colors hover:border-(--kt-turquoise) hover:bg-(--kt-turquoise-soft)">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--kt-bg-soft) text-(--kt-petrol) group-hover:bg-white"><Icon size={24} aria-hidden="true" /></span>
                  <span className="flex items-center justify-between gap-2 text-sm font-bold"><span className="break-words">{f.nombre}</span><ArrowRight size={15} aria-hidden="true" className="shrink-0 text-(--kt-ink-soft)" /></span>
                </Link>;
              })}
            </div>}
      </div>
    </section>}

    {puedeVer && <OfertasDestacadas ofertas={ofertas} />}

    {puedeVer && <section aria-labelledby="home-productos" className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-bold uppercase tracking-widest text-(--kt-teal-700)">{HOME_TIENDA.productosEtiqueta}</p><h2 id="home-productos" className="kt-display mt-2 text-2xl font-bold sm:text-3xl">{HOME_TIENDA.productosTitulo}</h2></div>
          <Link to={config.catalogPath} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-(--kt-petrol)">Explorar catálogo <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {productos.isPending ? <Esqueleto cantidad={4} />
          : productos.isError ? <ErrorConsulta mensaje="No pudimos cargar los productos." query={productos} />
          : lista.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-(--kt-border) p-6 text-sm text-(--kt-ink-soft)">Estamos preparando el catálogo. Pronto vas a encontrar productos para tu próximo pedido.</div>
          : <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{lista.map((p) => <ProductoCard key={p.id} producto={p} />)}</div>}
      </div>
    </section>}
  </>;
}

function Esqueleto({ cantidad }) {
  return <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="status" aria-label="Cargando catálogo">
    {Array.from({ length: cantidad }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-(--kt-bg-soft) motion-reduce:animate-none" />)}
  </div>;
}

function ErrorConsulta({ mensaje, query }) {
  return <div role="status" className="mt-5 rounded-2xl border border-(--kt-border) p-5 text-sm">
    <p>{mensaje}</p><button type="button" disabled={query.isFetching} onClick={() => query.refetch()} className="mt-2 min-h-11 font-bold text-(--kt-petrol) underline disabled:opacity-50">{query.isFetching ? "Cargando…" : "Reintentar"}</button>
  </div>;
}
