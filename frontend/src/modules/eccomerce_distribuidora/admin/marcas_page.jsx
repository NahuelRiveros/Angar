import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUpDown, Combine, Edit2, Package, Plus, Tag, Trash2 } from "lucide-react";
import SearchField from "../../../controls/ui/search_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import ComboboxField from "../../../controls/ui/combobox_field.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import AyudaTooltip from "../../../controls/ui/ayuda_tooltip.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { getCategorias } from "../api/categoria_distribuidora_api.js";
import { getResumenMarcas, unificarMarcas, eliminarMarca } from "../api/marcas_distribuidora_api.js";
import { construirOpcionesCategoria } from "../utils/categoria_jerarquia.js";
import { RUTA_MARCAS, rutaFichaMarca } from "../utils/rutas_articulo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";
const ICONO = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40";
const POR_PAGINA = 50;
const MAX_CHIPS = 2;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const rutaArticulos = (marca) => `/distribuidora/admin/productos?marca=${encodeURIComponent(marca)}`;
const OPCIONES_ESTADO = [
  { value: "con_articulos", label: "Con artículos" },
  { value: "sin_articulos", label: "Sin artículos" },
  { value: "sin_asociar", label: "Sin familia ni categoría" },
];

const AYUDA = {
  pagina: "Primero armá las familias y categorías; después creá cada marca y elegí dónde se ofrece: una familia entera o categorías puntuales. Al cargar un artículo, la lista de marcas muestra solo las de su categoría.",
  filtros: "Filtrá por familia o categoría para ver qué marcas se ofrecen ahí. \"Sin artículos\" y \"Sin familia ni categoría\" sirven para limpiar marcas que no se usan. Tocá el encabezado Artículos para ordenar por cantidad.",
};

/**
 * Marcas del catálogo en tabla paginada desde el servidor (pensada para miles):
 * buscar, filtrar por familia/categoría o estado y ordenar por nombre o cantidad
 * de artículos, todo en la dirección. La selección para unificar se conserva al
 * cambiar de página.
 */
export default function MarcasDistribuidoraPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filtros = {
    q: params.get("q") ?? "", categoria: params.get("categoria") ?? "", estado: params.get("estado") ?? "",
    orden: params.get("orden") === "articulos" ? "articulos" : "nombre",
    pagina: Math.max(1, Number(params.get("pagina")) || 1),
  };
  const hayFiltros = Boolean(filtros.q || filtros.categoria || filtros.estado);
  const actualizar = useCallback((cambios) => setParams((anterior) => {
    const siguiente = new URLSearchParams(anterior);
    for (const [clave, valor] of Object.entries({ pagina: null, ...cambios })) valor ? siguiente.set(clave, String(valor)) : siguiente.delete(clave);
    return siguiente;
  }), [setParams]);
  const [seleccion, setSeleccion] = useState(() => new Map()); // id → marca (sobrevive al cambio de página)
  const [modal, setModal] = useState(null);
  const [errorModal, setErrorModal] = useState("");

  const marcas = useQuery({
    queryKey: ["gestion-marcas-resumen", filtros],
    queryFn: () => getResumenMarcas({
      q: filtros.q || undefined, categoria: filtros.categoria || undefined, estado: filtros.estado || undefined,
      orden: filtros.orden, pagina: filtros.pagina, por_pagina: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  });
  const categorias = useQuery({ queryKey: ["gestion-categorias"], queryFn: getCategorias, staleTime: 60_000 });
  const opcionesCategoria = useMemo(() => construirOpcionesCategoria(categorias.data ?? []), [categorias.data]);
  const filas = marcas.data?.data ?? [];
  const totales = marcas.data?.totales;

  function cerrarModal() { setModal(null); setErrorModal(""); }
  async function refrescar() {
    await Promise.all(["gestion-marcas-resumen", "gestion-marcas", "marcas-familia", "gestion-articulos"].map((clave) => queryClient.invalidateQueries({ queryKey: [clave] })));
  }
  const accion = useMutation({
    mutationFn: ({ ejecutar }) => ejecutar(),
    onSuccess: async (r) => { toast.success(r?.mensaje || "Listo"); cerrarModal(); setSeleccion(new Map()); await refrescar(); },
    onError: (e, { enModal }) => {
      const mensaje = e.response?.data?.mensaje || "No se pudo completar la acción.";
      if (enModal) setErrorModal(mensaje); else { toast.error(mensaje); cerrarModal(); }
    },
  });
  function alternar(m) {
    setSeleccion((prev) => { const s = new Map(prev); if (s.has(m.id)) s.delete(m.id); else s.set(m.id, m); return s; });
  }
  const todasElegidas = filas.length > 0 && filas.every((m) => seleccion.has(m.id));
  function alternarPagina() {
    setSeleccion((prev) => { const s = new Map(prev); for (const m of filas) if (todasElegidas) s.delete(m.id); else s.set(m.id, m); return s; });
  }
  // Al volver de la ficha se recuperan los mismos filtros y página.
  const aca = params.toString() ? `${RUTA_MARCAS}?${params.toString()}` : RUTA_MARCAS;
  const editar = (m) => navigate(rutaFichaMarca({ id: m.id, volver: aca }));
  const nueva = () => navigate(rutaFichaMarca({ volver: aca }));
  const accionesDe = (m) => (
    <div className="flex shrink-0">
      <button type="button" onClick={() => editar(m)} className={ICONO} aria-label={`Editar ${m.nombre}`} title="Editar nombre y dónde se ofrece"><Edit2 size={18} /></button>
      <button type="button" onClick={() => setModal({ tipo: "eliminar", marca: m })} disabled={m.articulos > 0} className={ICONO} aria-label={`Eliminar ${m.nombre}`}
        title={m.articulos > 0 ? "Tiene artículos: unificala con otra marca" : "Eliminar"}><Trash2 size={18} /></button>
    </div>
  );
  const cantidad = (m) => (
    <Link to={rutaArticulos(m.nombre)} className="font-semibold whitespace-nowrap text-(--kt-teal-700) underline-offset-2 hover:underline">
      {m.articulos}{m.articulos > m.activos && <span className="ml-1 text-xs font-normal text-slate-500">({m.articulos - m.activos} inact.)</span>}
    </Link>
  );
  const donde = (m) => (
    <ul aria-label={`Dónde se ofrece ${m.nombre}`} className="flex flex-wrap gap-1">
      {m.categorias.length === 0 && <li className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">Sin familia ni categoría</li>}
      {m.categorias.slice(0, MAX_CHIPS).map((c) => <li key={c.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{c.ruta}</li>)}
      {m.categorias.length > MAX_CHIPS && (
        <li className="px-1 text-xs text-slate-500" title={m.categorias.slice(MAX_CHIPS).map((c) => c.ruta).join(", ")}>+{m.categorias.length - MAX_CHIPS}</li>
      )}
    </ul>
  );
  const encabezadoOrden = (campo, texto, alinear = "") => (
    <th className={`px-3 py-2 ${alinear}`} aria-sort={filtros.orden === campo ? (campo === "articulos" ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => actualizar({ orden: campo === "nombre" ? null : campo })} className="inline-flex min-h-9 items-center gap-1 uppercase hover:text-(--kt-ink)">
        {texto}{filtros.orden === campo ? <ArrowDown aria-hidden="true" size={14} /> : <ArrowUpDown aria-hidden="true" size={14} className="opacity-50" />}
      </button>
    </th>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Marcas</h1>
            <AyudaTooltip etiqueta="Cómo funcionan las marcas" texto={AYUDA.pagina} />
          </div>
          <p className="text-sm text-(--kt-ink-soft)">{totales ? `${plural(totales.marcas, "marca", "marcas")} · ${plural(totales.articulos, "artículo", "artículos")} con marca` : "Marcas y dónde se ofrecen."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/distribuidora/admin/productos" className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><Package size={16} /> Artículos</Link>
          <button type="button" onClick={nueva} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}><Plus size={16} /> Nueva marca</button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]">
        <SearchField value={filtros.q} onSearch={(q) => actualizar({ q })} label="Buscar marca" placeholder="Nombre de la marca, ej: bagley" />
        <ComboboxField label="Familia o categoría" vacioLabel="Todas" options={opcionesCategoria} value={filtros.categoria} onChange={(categoria) => actualizar({ categoria })} />
        <SelectField label="Estado" placeholder="Todas" options={OPCIONES_ESTADO} value={filtros.estado} onChange={(e) => actualizar({ estado: e.target.value })} />
        <div className="flex items-end"><AyudaTooltip etiqueta="Cómo filtrar y ordenar" texto={AYUDA.filtros} alinear="derecha" /></div>
      </div>

      {marcas.isError && (
        <div className="space-y-2">
          <ErrorBanner message="No pudimos cargar las marcas." />
          <button type="button" onClick={() => marcas.refetch()} className={`${BOTON} border border-slate-300 bg-white`}>Reintentar</button>
        </div>
      )}

      {marcas.isPending ? <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>
        : !marcas.isError && (filas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <AdminEmptyState icon={Tag} title={hayFiltros ? "No hay marcas con estos filtros." : "Todavía no hay marcas."}
              description={hayFiltros ? undefined : "Creá la primera y elegí en qué familias o categorías se ofrece."}
              action={hayFiltros
                ? <button type="button" onClick={() => setParams({})} className={`${BOTON} border border-slate-300`}>Limpiar filtros</button>
                : <button type="button" onClick={nueva} className={`${BOTON} bg-(--kt-petrol) text-white`}><Plus size={16} /> Nueva marca</button>} />
          </div>
        ) : (
          <section aria-label="Listado de marcas" aria-busy={marcas.isFetching} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">{plural(marcas.data.total, "marca", "marcas")}{hayFiltros ? " con estos filtros" : ""}</p>
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 md:hidden">
                <input type="checkbox" checked={todasElegidas} onChange={alternarPagina} className="h-5 w-5" /> Elegir esta página
              </label>
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="w-12 px-3 py-2"><input type="checkbox" checked={todasElegidas} onChange={alternarPagina} aria-label="Elegir todas las de esta página" className="h-5 w-5" /></th>
                    {encabezadoOrden("nombre", "Marca")}
                    {encabezadoOrden("articulos", "Artículos", "text-right")}
                    <th className="px-3 py-2">Dónde se ofrece</th>
                    <th className="px-3 py-2"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.map((m) => (
                    <tr key={m.id} className={seleccion.has(m.id) ? "bg-(--kt-turquoise-soft)" : ""}>
                      <td className="px-3 py-1"><input type="checkbox" checked={seleccion.has(m.id)} onChange={() => alternar(m)} aria-label={`Elegir ${m.nombre}`} className="h-5 w-5" /></td>
                      <td className="px-3 py-2 font-semibold text-(--kt-ink)">{m.nombre}</td>
                      <td className="px-3 py-2 text-right">{cantidad(m)}</td>
                      <td className="px-3 py-2">{donde(m)}</td>
                      <td className="px-1 py-1">{accionesDe(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 md:hidden">
              {filas.map((m) => (
                <li key={m.id} className={`rounded-2xl border border-slate-200 p-3 ${seleccion.has(m.id) ? "bg-(--kt-turquoise-soft)" : "bg-white"}`}>
                  <div className="flex items-start gap-2">
                    <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                      <span className="sr-only">Elegir {m.nombre}</span>
                      <input type="checkbox" checked={seleccion.has(m.id)} onChange={() => alternar(m)} className="h-5 w-5" />
                    </label>
                    <div className="min-w-0 flex-1 py-2">
                      <p className="font-semibold break-words text-(--kt-ink)">{m.nombre}</p>
                      <p className="text-xs text-slate-600">{cantidad(m)} {m.articulos === 1 ? "artículo" : "artículos"}</p>
                      <div className="mt-1">{donde(m)}</div>
                    </div>
                    {accionesDe(m)}
                  </div>
                </li>
              ))}
            </ul>

            <Pagination page={filtros.pagina} pages={marcas.data.total_paginas} total={marcas.data.total} disabled={marcas.isFetching}
              onChange={(pagina) => { actualizar({ pagina }); window.scrollTo({ top: 0, behavior: "instant" }); }} />
          </section>
        ))}

      {seleccion.size > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <span className="text-sm font-semibold">{plural(seleccion.size, "marca elegida", "marcas elegidas")}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSeleccion(new Map())} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Quitar selección</button>
            <button type="button" disabled={seleccion.size < 2} onClick={() => setModal({ tipo: "unificar", marcas: [...seleccion.values()] })}
              className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`} title={seleccion.size < 2 ? "Elegí al menos dos" : undefined}><Combine size={16} /> Unificar</button>
          </div>
        </div>
      )}

      {modal?.tipo === "unificar" && (
        <UnificarModal marcas={modal.marcas} guardando={accion.isPending} error={errorModal} onClose={cerrarModal}
          onConfirmar={(destino) => { setErrorModal(""); accion.mutate({ enModal: true, ejecutar: () => unificarMarcas(modal.marcas.map((m) => m.id), destino) }); }} />
      )}
      <ConfirmDialog
        open={modal?.tipo === "eliminar"} loading={accion.isPending} onClose={cerrarModal} confirmLabel="Eliminar" title="Eliminar marca"
        message={modal?.marca ? `¿Eliminar "${modal.marca.nombre}"? No tiene artículos.` : ""}
        onConfirm={() => accion.mutate({ enModal: false, ejecutar: () => eliminarMarca(modal.marca.id) })}
      />
    </div>
  );
}

function UnificarModal({ marcas, guardando, error, onConfirmar, onClose }) {
  // Por defecto queda la más usada, que suele ser la bien escrita.
  const [elegida, setElegida] = useState(() => [...marcas].sort((a, b) => b.articulos - a.articulos)[0].id);
  const total = marcas.reduce((suma, m) => suma + m.articulos, 0);
  return (
    <Modal title={`Unificar ${marcas.length} marcas`} onClose={onClose} busy={guardando}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onConfirmar(elegida); }}>
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm text-slate-600">¿Cuál queda? Sus {total} artículos y los lugares donde se ofrecen pasan a esa marca; las demás se eliminan.</legend>
          {marcas.map((m) => (
            <label key={m.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-slate-50">
              <input type="radio" name="destino" checked={elegida === m.id} onChange={() => setElegida(m.id)} className="h-5 w-5" />
              <span className="min-w-0 flex-1 break-words">{m.nombre}</span>
              <span className="text-xs text-slate-500">{m.articulos} art.</span>
            </label>
          ))}
        </fieldset>
        <ErrorBanner message={error} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={guardando} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Cancelar</button>
          <button type="submit" disabled={guardando} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>{guardando ? "Guardando…" : "Unificar"}</button>
        </div>
      </form>
    </Modal>
  );
}
