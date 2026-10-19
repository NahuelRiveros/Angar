import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgePercent, SlidersHorizontal } from "lucide-react";
import { getCategorias } from "../api/categoria_distribuidora_api.js";
import { getProductos } from "../api/producto_distribuidora_api.js";
import { useAuth } from "../../../auth/auth_context.jsx";
import { storefrontConfig as config } from "../../../config/storefront_config.js";
import SearchField from "../../../controls/ui/search_field.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import ActionButton from "../../../controls/ui/action_button.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ProductoCard from "./producto_card.jsx";
import CategoriasArbol from "./categorias_arbol.jsx";
export default function ProductosDistribuidoraPage() {
  const { isAuth, usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const q = params.get("q") ?? "";
  const category = Number(params.get("categoria")) || null;
  const page = Math.max(1, Math.floor(Number(params.get("pagina")) || 1));
  // ?oferta=1: solo productos en oferta para la lista de precios de quien mira (también se llega desde el home).
  const ofertas = params.get("oferta") === "1";
  const update = useCallback((patch) => setParams((old) => {
    const next = new URLSearchParams(old);
    Object.entries(patch).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
    return next;
  }), [setParams]);
  const search = useCallback((text) => update({ q: text, pagina: null }), [update]);
  const products = useQuery({ queryKey: ["storefront", "products", usuario?.usuario_id ?? "visitante", q, category, page, ofertas], queryFn: ({ signal }) => getProductos({ q: q || undefined, categoria: category || undefined, oferta: ofertas ? "1" : undefined, pagina: page, por_pagina: config.pageSize }, { signal, publicAccess: config.publicCatalog && !isAuth }), staleTime: 30000 });
  const categories = useQuery({ queryKey: ["storefront", "categories"], queryFn: getCategorias, staleTime: 60000 });
  const choose = (id) => { update({ categoria: id, pagina: null }); setFiltersOpen(false); };
  const tree = <CategoriasArbol categorias={categories.data ?? []} categoriaId={category} onSeleccionar={choose} />;
  return <div className="bg-(--kt-bg-soft) px-3 py-6 sm:px-6"><div className="mx-auto max-w-7xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-(--kt-teal-700)">Nuestro catálogo</p><h1 className="kt-display mt-1 text-3xl font-bold">{config.labels.title}</h1><p className="mt-2 text-sm text-slate-600">{config.labels.priceNotice}</p></div>
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-48 flex-1"><SearchField value={q} onSearch={search} label="Buscar productos" placeholder={config.labels.search} /></div>
      <button type="button" aria-pressed={ofertas} onClick={() => update({ oferta: ofertas ? null : "1", pagina: null })}
        className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${ofertas ? "border-(--kt-teal-700) bg-(--kt-teal-700) text-white" : "border-(--kt-border) bg-white"}`}>
        <BadgePercent size={18} aria-hidden="true" />Ofertas</button>
      <button type="button" onClick={() => setFiltersOpen(true)} className="flex min-h-11 items-center gap-2 rounded-xl border border-(--kt-border) bg-white px-3 text-sm md:hidden"><SlidersHorizontal size={18} />Categorías</button>
      {(q || category || ofertas) && <button type="button" onClick={() => setParams({})} className="min-h-11 px-3 text-sm font-semibold underline">Limpiar filtros</button>}
    </div>
    {categories.isError && <ErrorBanner message={<span>No pudimos cargar las categorías. <button onClick={() => categories.refetch()} className="underline">Reintentar</button></span>} />}
    <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden self-start rounded-2xl border border-(--kt-border) bg-white p-3 md:sticky md:top-20 md:block">{tree}</aside>
      <section aria-label="Resultados" aria-busy={products.isFetching}>
        {products.isPending ? <AdminSpinner /> : products.isError ? <div className="space-y-3"><ErrorBanner message="No pudimos cargar los productos. Revisá la conexión y volvé a intentar." /><ActionButton onClick={() => products.refetch()}>Reintentar</ActionButton></div>
          : !products.data?.data?.length ? <div className="rounded-2xl border border-dashed p-8 text-center"><p>{ofertas ? "No hay ofertas con estos filtros por ahora." : "No encontramos productos con estos filtros."}</p><button onClick={() => setParams({})} className="mt-3 min-h-11 underline">Ver todos los productos</button></div>
          : <><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{products.data.data.map((p) => <ProductoCard key={p.id} producto={p} />)}</div>
            <Pagination page={page} pages={products.data.total_paginas} total={products.data.total} disabled={products.isFetching} onChange={(p) => { update({ pagina: p }); window.scrollTo({ top: 0, behavior: "instant" }); }} /></>}
      </section>
    </div>
    {filtersOpen && <Modal title="Categorías" onClose={() => setFiltersOpen(false)}>{tree}</Modal>}
  </div></div>;
}
