import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ChevronRight, Combine, Edit2, FolderInput, FolderTree, Package, Plus, Trash2 } from "lucide-react";
import SearchField from "../../../controls/ui/search_field.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import AyudaTooltip from "../../../controls/ui/ayuda_tooltip.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria, fusionarCategoria, moverCategorias } from "../api/categoria_distribuidora_api.js";
import { indexarCategorias, construirOpcionesCategoria, slugify } from "../utils/categoria_jerarquia.js";
import { NombreModal, DestinoModal } from "./categorias_modales.jsx";
import { rutaFichaArticulo } from "../utils/rutas_articulo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";
const ICONO = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40";
const MAX_RESULTADOS = 100;
const sinAcentos = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const coincide = (texto, palabras) => { const base = sinAcentos(texto); return palabras.every((p) => base.includes(p)); };
const rutaArticulos = (id) => `/distribuidora/admin/productos?categoria=${id}`;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const AYUDA = {
  pagina: "El catálogo se ordena en dos niveles: Familia (Almacén, Limpieza, Ferretería) › Categoría (Galletitas, Lavandinas). Cada artículo va en una categoría; su marca es un dato del artículo y se filtra en Artículos.",
  buscar: "Busca en todas las familias a la vez. Alcanza con una parte del nombre y sin acentos: \"galle\" encuentra Galletitas.",
  familias: "Primer nivel del catálogo. Tocá una familia para ver y ordenar sus categorías.",
  acciones: "Lápiz: renombrar. Fusionar: pasa todo a otra familia (las categorías con igual nombre se unen) y borra esta. Tacho: solo si está vacía.",
  categorias: "Tildá una o varias para moverlas a otra familia. Fusionar pasa los artículos a otra categoría y borra esta: sirve para duplicados como Galletas y Galletitas. Solo se eliminan las vacías.",
};

/**
 * Familias y categorías en dos columnas (Familia › Categoría): a la izquierda las
 * familias, a la derecha las categorías de la elegida. Pensado para miles de
 * categorías: los artículos no se listan acá (eso es Artículos, paginado en el
 * servidor) y la búsqueda corre sobre el listado ya cargado, sin pedidos extra.
 */
export default function CategoriasDistribuidoraPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const familiaId = Number(params.get("familia")) || null;
  const filtro = params.get("filtro") ?? "";
  const [modal, setModal] = useState(null);
  const [errorModal, setErrorModal] = useState("");
  const [seleccion, setSeleccion] = useState(() => new Set());

  const categorias = useQuery({ queryKey: ["gestion-categorias"], queryFn: getCategorias, staleTime: 60_000 });
  const lista = categorias.data;
  const indice = useMemo(() => indexarCategorias(lista ?? []), [lista]);
  const familia = familiaId ? indice.porId.get(familiaId) : null;
  const familiaValida = familia && indice.familiaDe.get(familia.id) === familia.id ? familia : null;

  function navegar(cambios) {
    const siguiente = new URLSearchParams(params);
    for (const [clave, valor] of Object.entries(cambios)) valor ? siguiente.set(clave, String(valor)) : siguiente.delete(clave);
    setParams(siguiente);
  }
  function abrirFamilia(id, filtroInicial = "") {
    setSeleccion(new Set());
    navegar({ familia: id, q: null, filtro: filtroInicial || null });
  }
  function cerrarModal() { setModal(null); setErrorModal(""); }

  async function refrescar() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["gestion-categorias"] }),
      queryClient.invalidateQueries({ queryKey: ["gestion-articulos"] }),
    ]);
  }
  const accion = useMutation({
    mutationFn: ({ ejecutar }) => ejecutar(),
    onSuccess: async (r, { exito, despues }) => {
      toast.success(typeof exito === "function" ? exito(r) : exito);
      cerrarModal();
      despues?.(r);
      await refrescar();
    },
    onError: (e, { enModal = true }) => {
      const mensaje = e.response?.data?.mensaje || "No se pudo completar la acción.";
      if (enModal) setErrorModal(mensaje);
      else { toast.error(mensaje); cerrarModal(); }
    },
  });
  const ejecutar = (opciones) => { setErrorModal(""); accion.mutate(opciones); };

  // ── acciones ────────────────────────────────────────────────────────────
  function crearFamilia(nombre) {
    ejecutar({ ejecutar: () => crearCategoria({ nombre, slug: slugify(nombre), padre_id: null }), exito: `Familia "${nombre}" creada`,
      despues: (r) => r?.data?.id && abrirFamilia(r.data.id) });
  }
  function crearEnFamilia(nombre, alTerminar) {
    ejecutar({ ejecutar: () => crearCategoria({ nombre, slug: slugify(`${familiaValida.nombre} ${nombre}`), padre_id: familiaValida.id }),
      exito: `Categoría "${nombre}" agregada`, enModal: false, despues: alTerminar });
  }
  function renombrar(item, nombre) {
    // El slug no cambia: es la dirección pública de la categoría en la tienda.
    ejecutar({ ejecutar: () => actualizarCategoria(item.id, { nombre, slug: item.slug, padre_id: item.padre_id }), exito: "Nombre actualizado" });
  }
  function eliminar(item) {
    ejecutar({ ejecutar: () => eliminarCategoria(item.id), exito: `"${item.nombre}" eliminada`, enModal: false,
      despues: () => item.id === familiaValida?.id && navegar({ familia: null }) });
  }
  function fusionar(origen, destinoId) {
    const destino = indice.porId.get(destinoId);
    ejecutar({
      ejecutar: () => fusionarCategoria(origen.id, destinoId),
      exito: (r) => `"${origen.nombre}" quedó dentro de "${destino?.nombre}" · ${plural(r?.data?.productos_movidos ?? 0, "artículo movido", "artículos movidos")}`,
      despues: () => origen.id === familiaValida?.id && abrirFamilia(indice.familiaDe.get(destinoId)),
    });
  }
  function mover(ids, destinoId) {
    ejecutar({ ejecutar: () => moverCategorias(ids, destinoId), exito: `${plural(ids.length, "categoría movida", "categorías movidas")} a "${indice.porId.get(destinoId)?.nombre}"`,
      despues: () => setSeleccion(new Set()) });
  }

  const opcionesFamilia = useMemo(() => construirOpcionesCategoria(lista ?? [], { soloFamilias: true }), [lista]);
  const opcionesTodas = useMemo(() => construirOpcionesCategoria(lista ?? []), [lista]);

  // ── estados de carga ───────────────────────────────────────────────────
  let contenido;
  if (categorias.isPending) contenido = <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>;
  else if (categorias.isError) {
    contenido = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <span className="flex items-center gap-2"><AlertTriangle aria-hidden="true" size={18} />No pudimos cargar las familias.</span>
        <button type="button" onClick={() => categorias.refetch()} className={`${BOTON} bg-white shadow-sm`}>Reintentar</button>
      </div>
    );
  } else if (indice.familias.length === 0) {
    contenido = (
      <div className="rounded-2xl border border-slate-200 bg-white">
        <AdminEmptyState icon={FolderTree} title="Todavía no hay familias." description="Creá la primera (por ejemplo, Almacén) o importá un archivo de productos." />
      </div>
    );
  } else if (q) {
    contenido = <ResultadosBusqueda q={q} indice={indice} onAbrir={abrirFamilia} />;
  } else {
    contenido = (
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ListaFamilias indice={indice} actual={familiaValida?.id} oculta={Boolean(familiaValida)} onAbrir={abrirFamilia} />
        {familiaValida ? (
          <DetalleFamilia
            key={familiaValida.id} familia={familiaValida} indice={indice} filtro={filtro} onFiltro={(f) => navegar({ filtro: f || null })}
            seleccion={seleccion} setSeleccion={setSeleccion} ocupado={accion.isPending}
            onVolver={() => navegar({ familia: null, filtro: null })}
            onCrear={crearEnFamilia}
            onRenombrar={(item) => setModal({ tipo: "renombrar", item })}
            onFusionar={(item) => setModal({ tipo: "fusionar", item })}
            onEliminar={(item) => setModal({ tipo: "eliminar", item })}
            onMover={() => setModal({ tipo: "mover", ids: [...seleccion] })}
          />
        ) : (
          <div className="hidden items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 lg:flex">
            Elegí una familia para ver y ordenar sus categorías.
          </div>
        )}
      </div>
    );
  }

  const totalArticulos = indice.familias.reduce((suma, f) => suma + indice.totalDe.get(f.id), 0);
  const item = modal?.item;
  const esFamilia = item && indice.familiaDe.get(item.id) === item.id;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Familias y categorías</h1>
            <AyudaTooltip etiqueta="Cómo se ordena el catálogo" texto={AYUDA.pagina} />
          </div>
          <p className="text-sm text-(--kt-ink-soft)">
            {lista ? `${plural(indice.familias.length, "familia", "familias")} · ${plural(lista.length - indice.familias.length, "categoría", "categorías")} · ${plural(totalArticulos, "artículo", "artículos")}` : "Ordená el catálogo en dos niveles: Familia › Categoría."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/distribuidora/admin/productos" className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><Package size={16} /> Artículos</Link>
          <button type="button" onClick={() => setModal({ tipo: "familia" })} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}><Plus size={16} /> Nueva familia</button>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="min-w-0 flex-1"><SearchField value={q} onSearch={(texto) => navegar({ q: texto || null })} label="Buscar familia o categoría" placeholder="Buscar en todas las familias, ej: galletitas" delay={200} /></div>
        <AyudaTooltip etiqueta="Cómo funciona la búsqueda" texto={AYUDA.buscar} alinear="derecha" />
      </div>

      {contenido}

      {modal?.tipo === "familia" && (
        <NombreModal titulo="Nueva familia" ayuda="Una familia agrupa categorías, por ejemplo Almacén › Galletitas." guardando={accion.isPending} error={errorModal} onGuardar={crearFamilia} onClose={cerrarModal} />
      )}
      {modal?.tipo === "renombrar" && (
        <NombreModal titulo={esFamilia ? "Renombrar familia" : "Renombrar categoría"} nombreInicial={item.nombre} guardando={accion.isPending} error={errorModal}
          onGuardar={(nombre) => renombrar(item, nombre)} onClose={cerrarModal} />
      )}
      {modal?.tipo === "fusionar" && (
        <DestinoModal
          titulo={`Fusionar "${item.nombre}"`} etiqueta="Fusionar" peligro guardando={accion.isPending} error={errorModal} onClose={cerrarModal}
          descripcion={esFamilia
            ? "Sus categorías pasan a la familia que elijas (las de igual nombre se unen) y esta familia se elimina. No se puede deshacer."
            : "Sus artículos pasan a la familia o categoría que elijas y esta categoría se elimina. No se puede deshacer."}
          opciones={(esFamilia ? opcionesFamilia : opcionesTodas).filter((o) => o.value !== item.id)}
          resumen={(destinoId) => `${plural(indice.totalDe.get(item.id), "artículo pasa", "artículos pasan")} a "${indice.rutaDe.get(destinoId)}".`}
          onConfirmar={(destinoId) => fusionar(item, destinoId)}
        />
      )}
      {modal?.tipo === "mover" && (
        <DestinoModal
          titulo={`Mover ${plural(modal.ids.length, "categoría", "categorías")}`} etiqueta="Mover" guardando={accion.isPending} error={errorModal} onClose={cerrarModal}
          descripcion="Las categorías elegidas, con sus artículos, pasan a otra familia."
          opciones={opcionesFamilia.filter((o) => o.value !== familiaValida?.id)}
          onConfirmar={(destinoId) => mover(modal.ids, destinoId)}
        />
      )}
      <ConfirmDialog
        open={modal?.tipo === "eliminar"} loading={accion.isPending} onClose={cerrarModal} confirmLabel="Eliminar"
        title={esFamilia ? "Eliminar familia" : "Eliminar categoría"}
        message={item ? `¿Eliminar "${item.nombre}"? Está vacía: no tiene artículos ni categorías.` : ""}
        onConfirm={() => eliminar(item)}
      />
    </div>
  );
}

function ListaFamilias({ indice, actual, oculta, onAbrir }) {
  return (
    <nav aria-label="Familias" className={`${oculta ? "hidden lg:block" : ""} rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto`}>
      <div className="flex items-center justify-between border-b border-slate-100 py-1 pl-4">
        <h2 className="text-xs font-semibold tracking-wider text-(--kt-ink-soft) uppercase">Familias</h2>
        <AyudaTooltip etiqueta="Qué es una familia" texto={AYUDA.familias} alinear="derecha" />
      </div>
      <ul className="divide-y divide-slate-100">
        {indice.familias.map((f) => {
          const cantidad = indice.categoriasDe.get(f.id).length;
          return (
            <li key={f.id}>
              <button type="button" onClick={() => onAbrir(f.id)} aria-current={f.id === actual ? "true" : undefined}
                className={`flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-(--kt-turquoise) ${f.id === actual ? "bg-(--kt-turquoise-soft)" : ""}`}>
                <span className="min-w-0">
                  <span className="block font-semibold break-words text-(--kt-ink)">{f.nombre}</span>
                  <span className="block text-xs text-slate-500">{plural(cantidad, "categoría", "categorías")} · {plural(indice.totalDe.get(f.id), "artículo", "artículos")}</span>
                </span>
                <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-slate-400" />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DetalleFamilia({ familia, indice, filtro, onFiltro, seleccion, setSeleccion, ocupado, onVolver, onCrear, onRenombrar, onFusionar, onEliminar, onMover }) {
  const [nueva, setNueva] = useState("");
  const todas = indice.categoriasDe.get(familia.id);
  const palabras = sinAcentos(filtro).split(/\s+/).filter(Boolean);
  const visibles = palabras.length ? todas.filter((c) => coincide(c.nombre, palabras)) : todas;
  const directos = familia.cantidad_productos ?? 0;
  const vacia = todas.length === 0 && indice.totalDe.get(familia.id) === 0;
  // Ruta sin la familia: en niveles heredados muestra "Galletitas › Dulces".
  const nombreEnFamilia = (c) => indice.rutaDe.get(c.id).split(" › ").slice(1).join(" › ");
  const elegidas = visibles.filter((c) => seleccion.has(c.id));
  const todasElegidas = visibles.length > 0 && elegidas.length === visibles.length;

  function alternar(id) {
    setSeleccion((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }
  function alternarTodas() {
    setSeleccion((prev) => { const s = new Set(prev); for (const c of visibles) if (todasElegidas) s.delete(c.id); else s.add(c.id); return s; });
  }

  return (
    <section aria-labelledby="familia-titulo" className="min-w-0 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <button type="button" onClick={onVolver} className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-(--kt-teal-700) lg:hidden"><ArrowLeft size={16} /> Familias</button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-(--kt-ink-soft) uppercase">Familia</p>
            <h2 id="familia-titulo" className="text-xl font-bold break-words text-(--kt-ink)">{familia.nombre}</h2>
            <p className="text-sm text-slate-500">{plural(todas.length, "categoría", "categorías")} · {plural(indice.totalDe.get(familia.id), "artículo", "artículos")}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Link to={rutaArticulos(familia.id)} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><Package size={16} /> Ver artículos</Link>
            <Link to={rutaFichaArticulo({ familia: familia.id, volver: `/distribuidora/admin/categorias?familia=${familia.id}` })}
              aria-label={`Nuevo artículo en ${familia.nombre}`} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><Plus size={16} /> Artículo</Link>
            <button type="button" onClick={() => onRenombrar(familia)} className={ICONO} aria-label={`Renombrar familia ${familia.nombre}`} title="Renombrar"><Edit2 size={18} /></button>
            <button type="button" onClick={() => onFusionar(familia)} className={ICONO} aria-label={`Fusionar familia ${familia.nombre}`} title="Fusionar con otra familia"><Combine size={18} /></button>
            <button type="button" onClick={() => onEliminar(familia)} disabled={!vacia} className={ICONO} aria-label={`Eliminar familia ${familia.nombre}`}
              title={vacia ? "Eliminar" : "Solo se puede eliminar vacía: fusionala con otra familia"}><Trash2 size={18} /></button>
            <AyudaTooltip etiqueta="Qué hace cada botón" texto={AYUDA.acciones} alinear="derecha" />
          </div>
        </div>
        {directos > 0 && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {plural(directos, "artículo está cargado", "artículos están cargados")} directo en la familia, sin categoría.
          </p>
        )}
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const nombre = nueva.trim(); if (nombre) onCrear(nombre, () => setNueva("")); }}>
          <label htmlFor="nueva-categoria" className="sr-only">Nueva categoría en {familia.nombre}</label>
          <input id="nueva-categoria" value={nueva} maxLength={80} onChange={(e) => setNueva(e.target.value)} placeholder={`Nueva categoría en ${familia.nombre}`}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25" />
          <button type="submit" disabled={ocupado || !nueva.trim()} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}><Plus size={16} /> Agregar</button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          {visibles.length > 0 && (
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={todasElegidas} onChange={alternarTodas} className="h-5 w-5" /> Elegir todas
            </label>
          )}
          <AyudaTooltip etiqueta="Cómo ordenar las categorías" texto={AYUDA.categorias} />
          {todas.length > 8 && (
            <div className="ml-auto w-full sm:w-64">
              <label htmlFor="filtro-categorias" className="sr-only">Filtrar categorías de {familia.nombre}</label>
              <input id="filtro-categorias" type="search" value={filtro} onChange={(e) => onFiltro(e.target.value)} placeholder="Filtrar en esta familia"
                className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25" />
            </div>
          )}
        </div>
        {todas.length === 0 ? (
          <AdminEmptyState icon={FolderTree} title="Esta familia no tiene categorías." description="Agregá la primera con el campo de arriba." />
        ) : visibles.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Ninguna categoría coincide con “{filtro}”.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibles.map((c) => {
              const total = indice.totalDe.get(c.id);
              const sinHijas = !indice.hijosDe.has(c.id);
              return (
                <li key={c.id} className={`flex items-center gap-2 px-2 py-1 sm:px-4 ${seleccion.has(c.id) ? "bg-(--kt-turquoise-soft)" : ""}`}>
                  <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                    <span className="sr-only">Elegir {c.nombre}</span>
                    <input type="checkbox" checked={seleccion.has(c.id)} onChange={() => alternar(c.id)} className="h-5 w-5" />
                  </label>
                  <div className="min-w-0 flex-1 py-2">
                    <p className="font-semibold break-words text-(--kt-ink)">{nombreEnFamilia(c)}</p>
                    <Link to={rutaArticulos(c.id)} className="text-xs font-semibold text-(--kt-teal-700) underline-offset-2 hover:underline">{plural(total, "artículo", "artículos")}</Link>
                  </div>
                  <button type="button" onClick={() => onRenombrar(c)} className={ICONO} aria-label={`Renombrar ${c.nombre}`} title="Renombrar"><Edit2 size={18} /></button>
                  <button type="button" onClick={() => onFusionar(c)} className={ICONO} aria-label={`Fusionar ${c.nombre}`} title="Fusionar con otra"><Combine size={18} /></button>
                  <button type="button" onClick={() => onEliminar(c)} disabled={total > 0 || !sinHijas} className={ICONO} aria-label={`Eliminar ${c.nombre}`}
                    title={total > 0 ? "Tiene artículos: fusionala con otra para no perderlos" : "Eliminar"}><Trash2 size={18} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {seleccion.size > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <span className="text-sm font-semibold">{plural(seleccion.size, "categoría elegida", "categorías elegidas")}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSeleccion(new Set())} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Quitar selección</button>
            <button type="button" onClick={onMover} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}><FolderInput size={16} /> Mover a otra familia</button>
          </div>
        </div>
      )}
    </section>
  );
}

function ResultadosBusqueda({ q, indice, onAbrir }) {
  const palabras = sinAcentos(q).split(/\s+/).filter(Boolean);
  const todas = [...indice.porId.values()].filter((c) => coincide(indice.rutaDe.get(c.id), palabras))
    .sort((a, b) => indice.rutaDe.get(a.id).localeCompare(indice.rutaDe.get(b.id), "es"));
  const visibles = todas.slice(0, MAX_RESULTADOS);
  return (
    <section aria-label="Resultados de la búsqueda" className="rounded-2xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
        {todas.length === 0 ? `Ninguna familia ni categoría coincide con “${q}”.`
          : todas.length > visibles.length ? `Mostrando ${visibles.length} de ${todas.length}: seguí escribiendo para acotar.`
            : plural(todas.length, "resultado", "resultados")}
      </p>
      <ul className="divide-y divide-slate-100">
        {visibles.map((c) => {
          const familiaId = indice.familiaDe.get(c.id);
          const esFamilia = familiaId === c.id;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => onAbrir(familiaId, esFamilia ? "" : c.nombre)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)">
                <span className="min-w-0">
                  <span className="block font-semibold break-words text-(--kt-ink)">{indice.rutaDe.get(c.id)}</span>
                  <span className="block text-xs text-slate-500">{esFamilia ? "Familia" : "Categoría"} · {plural(indice.totalDe.get(c.id), "artículo", "artículos")}</span>
                </span>
                <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-slate-400" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
