import { PackageSearch } from "lucide-react";
import Pagination from "../../../controls/ui/pagination.jsx";
import SearchField from "../../../controls/ui/search_field.jsx";
import { BOTON_SECUNDARIO } from "../../../controls/ui/estilos.js";
import { Cargando, ErrorReintentar } from "../../../controls/ui/estados_web.jsx";
import { useFiltrosUrl } from "../../../hooks/use_filtros_url.js";
import { useCategorias, useProductos } from "../hooks.js";
import FiltroCategorias from "./filtro_categorias.jsx";
import Tarjeta from "./tarjeta.jsx";

/** MCA-06. */
export default function CatalogoPage() {
  const { filtros, cambiar } = useFiltrosUrl(["categoria", "q"]);
  const categorias = useCategorias();
  const consulta = useProductos(filtros);
  const hayFiltros = Boolean(filtros.q || filtros.categoria);
  return (
    <div className="kt-body min-h-screen bg-white text-(--kt-ink)">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="kt-display text-3xl font-bold sm:text-4xl">Catálogo</h1>
          <div className="w-full sm:max-w-xs"><SearchField value={filtros.q ?? ""} onSearch={(q) => cambiar({ q })} label="Buscar productos" placeholder="Buscar por nombre o código" /></div>
        </div>
        <FiltroCategorias categorias={categorias.data} elegida={filtros.categoria} onElegir={(categoria) => cambiar({ categoria })} />
        {consulta.isPending ? <Cargando texto="Cargando los productos" />
          : consulta.isError ? <ErrorReintentar consulta={consulta} mensaje="No pudimos cargar los productos." />
            : consulta.data.items.length === 0 ? <Vacio hayFiltros={hayFiltros} onLimpiar={() => cambiar({ q: "", categoria: "" })} />
              : (
                <div aria-busy={consulta.isPlaceholderData} className={consulta.isPlaceholderData ? "opacity-60" : ""}>
                  <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{consulta.data.items.map((p) => <li key={p.id} className="grid"><Tarjeta producto={p} /></li>)}</ul>
                  {consulta.data.paginacion.totalPages > 1 && (
                    <Pagination page={consulta.data.paginacion.page} pages={consulta.data.paginacion.totalPages} total={consulta.data.paginacion.total}
                      disabled={consulta.isPlaceholderData} onChange={(page) => { cambiar({ page: String(page) }); window.scrollTo({ top: 0 }); }} />
                  )}
                </div>
              )}
      </div>
    </div>
  );
}

function Vacio({ hayFiltros, onLimpiar }) {
  return (
    <div className="rounded-2xl border border-dashed border-(--kt-border) px-4 py-16 text-center">
      <PackageSearch size={44} aria-hidden="true" className="mx-auto text-slate-400" />
      <p className="mt-3 text-lg font-semibold">{hayFiltros ? "No encontramos productos con esa búsqueda" : "Pronto vas a ver acá nuestros productos"}</p>
      {hayFiltros && <button type="button" onClick={onLimpiar} className={`${BOTON_SECUNDARIO} mt-5`}>Ver todos</button>}
    </div>
  );
}
