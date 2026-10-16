import { useMemo, useRef, useState } from "react";
import { Edit2, Plus, FolderPlus, ShieldCheck, ShieldOff, Trash2, DollarSign } from "lucide-react";
import TreeView from "../../../controls/ui/tree_view.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { useCrudPage } from "../../../hooks/use_crud_page.js";
import { getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria } from "../api/categoria_distribuidora_api.js";
import {
  getProductos, crearProducto, actualizarProducto, cambiarEstadoProducto, eliminarProducto,
} from "../api/producto_distribuidora_api.js";
import { construirOpcionesCategoria } from "../utils/categoria_jerarquia.js";
import { formatearPrecio } from "../utils/precio_iva.js";
import CategoriaFormModal from "./categoria_form_modal.jsx";
import ProductoFormModal from "./producto_form_modal.jsx";
import AjustePreciosModal from "./ajuste_precios_modal.jsx";

/**
 * ── página: categorías y productos unificados en un solo árbol ──
 *
 * Los productos se cargan de a una categoría por vez, recién cuando esa
 * categoría se expande (no hay un "traer todos los productos" al entrar a
 * la página) — pensado para miles de productos, donde traer
 * todo de una sería lento y la mayoría ni se llega a ver. Las categorías sí
 * son siempre eager (son pocas, no pesan). `cantidad_productos` viaja con
 * cada categoría (lo agrega el backend) así el árbol sabe qué nodos son
 * expandibles y cuáles están realmente vacíos SIN tener que cargar nada.
 */
export default function ProductosDistribuidoraPage() {
  const [ajustePrecios, setAjustePrecios] = useState(null); // null | { producto } | { masivo: true }

  // ── categorías: eager, vía useCrudPage (listado chico, CRUD normal) ──────
  const {
    items: categorias, cargando: cargandoCategorias, error: errorCategorias,
    modalAbierto: modalCategoriaAbierto, seleccionado: categoriaEditar, guardando: guardandoCategoria,
    abrirNuevo: abrirNuevaCategoriaBase, abrirEditar: abrirEditarCategoria, cerrarModal: cerrarModalCategoriaBase,
    guardar: guardarCategoria, ejecutarAccion: ejecutarAccionCategoria, cargar: cargarCategorias,
  } = useCrudPage({
    fetchFn: getCategorias,
    createFn: crearCategoria,
    updateFn: actualizarCategoria,
    extractItems: (r) => r ?? [],
    mensajeErrorCarga: "No se pudo cargar el listado de categorías",
  });

  // ── productos: perezoso, uno por categoría ────────────────────────────────
  // { [categoria_id]: producto[] } — solo tiene entradas para categorías que
  // ya se expandieron alguna vez (o que aparecieron en una búsqueda).
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  // { [categoria_id]: { pagina, totalPaginas } } — de cuántas hay cargadas
  // hoy vs. cuántas existen en total, para poder ofrecer "Cargar más" en vez
  // de truncar en silencio una categoría con más de 1000 productos.
  const [paginacionPorCategoria, setPaginacionPorCategoria] = useState({});
  // Qué categorías ya se pidieron al servidor (loading o listo) — evita
  // repetir el fetch cada vez que se vuelve a expandir la misma categoría.
  const cargadasRef = useRef(new Set());
  const [errorProducto, setErrorProducto] = useState("");

  async function cargarProductosDeCategoria(categoriaId, { forzar = false, pagina = 1 } = {}) {
    // El guard de "ya cargada" solo aplica a la primera página — "Cargar más"
    // (pagina > 1) siempre tiene que pegarle al servidor, nunca se saltea.
    if (pagina === 1) {
      if (!forzar && cargadasRef.current.has(categoriaId)) return;
      cargadasRef.current.add(categoriaId);
    }
    try {
      // incluirDescendientes:false — acá queremos SOLO lo propio de esta
      // categoría puntual; las subcategorías ya están en el árbol aparte,
      // si además tuviéramos los descendientes se duplicaría/mezclaría todo
      // bajo el nodo equivocado. por_pagina:1000 sigue siendo el tamaño de
      // página (alcanza para casi cualquier categoría en un solo pedido) —
      // lo que cambia es que ahora SE PUEDE pedir la página siguiente en vez
      // de perder en silencio lo que sobra de la 1000.
      const r = await getProductos({ categoria: categoriaId, incluirDescendientes: false, pagina, por_pagina: 1000 });
      setProductosPorCategoria((prev) => ({
        ...prev,
        [categoriaId]: pagina === 1 ? (r.data ?? []) : [...(prev[categoriaId] ?? []), ...(r.data ?? [])],
      }));
      setPaginacionPorCategoria((prev) => ({ ...prev, [categoriaId]: { pagina: r.pagina, totalPaginas: r.total_paginas } }));
    } catch {
      if (pagina === 1) cargadasRef.current.delete(categoriaId); // permite reintentar si falló
      setErrorProducto("No se pudieron cargar los productos de esa categoría");
    }
  }

  function cargarMasDeCategoria(categoriaId) {
    const siguiente = (paginacionPorCategoria[categoriaId]?.pagina ?? 1) + 1;
    return cargarProductosDeCategoria(categoriaId, { pagina: siguiente });
  }

  function refrescarCategoria(categoriaId) {
    return cargarProductosDeCategoria(categoriaId, { forzar: true });
  }

  // Solo pedimos productos al expandir si la categoría tiene algo propio
  // cargado (cantidad_productos > 0) — si es puramente organizativa (todo
  // su contenido son subcategorías), expandirla no debería pegarle al
  // servidor para nada, sus hijas ya están en el árbol eager.
  function onExpandirNodo(nodo) {
    if (nodo.tipo !== "categoria") return undefined;
    const cat = categorias.find((c) => c.id === nodo.id);
    if (!cat || (cat.cantidad_productos ?? 0) === 0) return undefined;
    return cargarProductosDeCategoria(nodo.id);
  }

  // Buscador del árbol — además del filtro local (ya lo hace TreeView), le
  // pega al servidor sin restricción de categoría para encontrar productos
  // en categorías todavía no expandidas, y los suma al cache por categoría.
  const busquedaTimeoutRef = useRef(null);
  // Si la búsqueda global (sin filtro de categoría) tiene más de 100
  // coincidencias, las que sobran no llegan — antes esto pasaba en silencio;
  // ahora queda registrado para avisarle al admin que refine la búsqueda.
  const [busquedaTotal, setBusquedaTotal] = useState(null);
  function onQueryChange(texto) {
    clearTimeout(busquedaTimeoutRef.current);
    const q = texto.trim();
    if (!q) { setBusquedaTotal(null); return; }
    busquedaTimeoutRef.current = setTimeout(async () => {
      try {
        const r = await getProductos({ q, por_pagina: 100 });
        setBusquedaTotal(r.total ?? null);
        const porCategoria = {};
        for (const p of r.data ?? []) (porCategoria[p.categoria_id] ??= []).push(p);
        setProductosPorCategoria((prev) => {
          const next = { ...prev };
          for (const [catId, prods] of Object.entries(porCategoria)) {
            const existentes = next[catId] ?? [];
            const idsExistentes = new Set(existentes.map((x) => x.id));
            next[catId] = [...existentes, ...prods.filter((p) => !idsExistentes.has(p.id))];
          }
          return next;
        });
      } catch { /* búsqueda falló silenciosamente, no rompe el árbol */ }
    }, 350);
  }

  const opcionesCategoria = useMemo(() => construirOpcionesCategoria(categorias), [categorias]);

  // ── modal de producto (alta/edición) — manejo propio, no useCrudPage,
  // porque acá no hay un único "items" para refrescar: hay que refrescar la
  // categoría destino (y la de origen, si se cambió de categoría al editar).
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [categoriaPreseleccionada, setCategoriaPreseleccionada] = useState(null);
  const [padrePreseleccionado, setPadrePreseleccionado] = useState(null);

  function abrirNuevoProducto() {
    setProductoEditar(null);
    setModalProductoAbierto(true);
  }

  function abrirNuevoEnCategoria(categoriaId) {
    setCategoriaPreseleccionada(categoriaId);
    abrirNuevoProducto();
  }

  function abrirEditarProducto(row) {
    setProductoEditar(row);
    setModalProductoAbierto(true);
  }

  function cerrarModalProducto() {
    setModalProductoAbierto(false);
    setProductoEditar(null);
    setCategoriaPreseleccionada(null);
  }

  async function guardarProducto(payload) {
    setGuardandoProducto(true);
    setErrorProducto("");
    try {
      const categoriaAnterior = productoEditar?.categoria_id;
      const r = productoEditar
        ? await actualizarProducto(productoEditar.id, payload)
        : await crearProducto(payload);
      if (r?.ok === false) { setErrorProducto(r.mensaje); return; }
      cerrarModalProducto();
      await refrescarCategoria(payload.categoria_id);
      if (categoriaAnterior && categoriaAnterior !== payload.categoria_id) await refrescarCategoria(categoriaAnterior);
      await cargarCategorias(); // los conteos (cantidad_productos) pueden haber cambiado
    } catch (e) {
      setErrorProducto(e?.response?.data?.mensaje || "No se pudo guardar el producto");
    } finally {
      setGuardandoProducto(false);
    }
  }

  async function ejecutarAccionProducto(row, fn, { confirmMessage, mensajeError, refrescarConteos = false }) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    try {
      const r = await fn();
      if (r?.ok === false) { setErrorProducto(r.mensaje || mensajeError); return; }
      await refrescarCategoria(row.categoria_id);
      if (refrescarConteos) await cargarCategorias();
    } catch (e) {
      setErrorProducto(e?.response?.data?.mensaje || mensajeError);
    }
  }

  function toggleEstado(row) {
    const nuevoEstado = !row.activo;
    ejecutarAccionProducto(row, () => cambiarEstadoProducto(row.id, nuevoEstado), {
      confirmMessage: `¿Seguro que querés ${nuevoEstado ? "activar" : "desactivar"} "${row.nombre}"?`,
      mensajeError: "No se pudo cambiar el estado",
    });
  }

  function eliminarProductoNodo(row) {
    ejecutarAccionProducto(row, () => eliminarProducto(row.id), {
      confirmMessage: `¿Eliminar el producto "${row.nombre}"? Esto también elimina sus variedades. No se puede deshacer desde acá.`,
      mensajeError: "No se pudo eliminar el producto",
      refrescarConteos: true,
    });
  }

  // ── categorías: alta de subcategoría / raíz ───────────────────────────────
  function abrirNuevaSubcategoria(padreId) {
    setPadrePreseleccionado(padreId);
    abrirNuevaCategoriaBase();
  }

  function abrirNuevaCategoriaRaiz() {
    setPadrePreseleccionado(null);
    abrirNuevaCategoriaBase();
  }

  function cerrarModalCategoria() {
    cerrarModalCategoriaBase();
    setPadrePreseleccionado(null);
  }

  function tieneSubcategorias(nodo) {
    return categorias.some((c) => c.padre_id === nodo.id);
  }

  // Solo se puede borrar una categoría vacía (sin subcategorías ni
  // productos) — evita perder productos/subcategorías "escondidos" abajo
  // sin querer al limpiar una categoría creada de más por error.
  function categoriaEsHoja(nodo) {
    const cat = categorias.find((c) => c.id === nodo.id);
    return !tieneSubcategorias(nodo) && (cat?.cantidad_productos ?? 0) === 0;
  }

  function eliminarCategoriaNodo(nodo) {
    ejecutarAccionCategoria(() => eliminarCategoria(nodo.id), {
      confirmMessage: `¿Eliminar la categoría "${nodo.nombre}"? Está vacía, no tiene productos ni subcategorías.`,
      mensajeError: "No se pudo eliminar la categoría",
    });
  }

  // El árbol combina tres tipos de nodo: categorías (todas, eager), productos
  // (solo los de las categorías ya expandidas/buscadas) y un pseudo-nodo
  // "cargar más" por cada categoría que todavía tiene páginas sin traer (más
  // de 1000 productos propios). Prefijamos los ids para que no choquen.
  const treeItems = useMemo(() => {
    const productosFlat = Object.values(productosPorCategoria).flat();
    const cargarMasItems = Object.entries(paginacionPorCategoria)
      .filter(([, info]) => info.pagina < info.totalPaginas)
      .map(([catId, info]) => ({
        tipo: "cargar_mas", categoriaId: Number(catId),
        treeId: `cargar-mas-${catId}`, treeParentId: `cat-${catId}`,
        restantes: info.totalPaginas - info.pagina,
      }));
    return [
      ...categorias.map((c) => ({
        ...c, tipo: "categoria",
        treeId: `cat-${c.id}`, treeParentId: c.padre_id != null ? `cat-${c.padre_id}` : null,
        // le dice a TreeView "esto capaz tiene hijos que todavía no llegaron"
        // (productos propios sin cargar) aunque `children` esté vacío por ahora.
        siempreExpandible: (c.cantidad_productos ?? 0) > 0,
      })),
      ...productosFlat.map((p) => ({
        ...p, tipo: "producto",
        treeId: `prod-${p.id}`, treeParentId: `cat-${p.categoria_id}`,
      })),
      ...cargarMasItems,
    ];
  }, [categorias, productosPorCategoria, paginacionPorCategoria]);

  function renderLabel(nodo) {
    if (nodo.tipo === "categoria") {
      return (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800">{nodo.nombre}</span>
          {/* Cuántos productos tiene DIRECTO esta categoría — se ve sin
              tener que expandirla, así se sabe si vale la pena entrar. */}
          {(nodo.cantidad_productos ?? 0) > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {nodo.cantidad_productos} producto{nodo.cantidad_productos === 1 ? "" : "s"}
            </span>
          )}
        </span>
      );
    }
    if (nodo.tipo === "cargar_mas") {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); cargarMasDeCategoria(nodo.categoriaId); }}
          className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
        >
          Cargar más productos… ({nodo.restantes} página{nodo.restantes === 1 ? "" : "s"} más)
        </button>
      );
    }
    const variedad = nodo.variedades?.[0];
    const sinStock = variedad?.controla_stock && Number(variedad.cantidad) <= 0;
    const enOferta = variedad?.precio_anterior && Number(variedad.precio_anterior) > Number(variedad.precio);
    const fecha = nodo.fecha_alta ? `Agregado el ${new Date(nodo.fecha_alta).toLocaleDateString("es-AR", { timeZone: "UTC" })}` : undefined;
    return (
      // Identidad (nombre + marca) a la izquierda, estado (precio/oferta/
      // stock/activo) agrupado a la derecha — antes eran 7 datos sueltos en
      // una sola tira, sin distinguir "qué es" de "cómo está".
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 items-baseline gap-1.5" title={fecha}>
          <span className="truncate font-medium text-slate-700">{nodo.nombre}</span>
          {nodo.marca && <span className="shrink-0 text-xs text-slate-400">{nodo.marca}</span>}
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-1.5">
          {variedad ? (
            <span className="text-xs font-bold text-slate-700">{formatearPrecio(variedad.precio)}</span>
          ) : (
            <span className="text-xs font-bold text-amber-600">Sin precio</span>
          )}
          {enOferta && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Oferta</span>}
          {sinStock && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">Sin stock</span>}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${nodo.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
            {nodo.activo ? <ShieldCheck size={9} /> : <ShieldOff size={9} />}
            {nodo.activo ? "Activo" : "Inactivo"}
          </span>
        </span>
      </span>
    );
  }

  const esProducto = (n) => n.tipo === "producto";
  const esCategoria = (n) => n.tipo === "categoria";
  const actions = [
    { key: "agregar-subcategoria", label: "Nueva subcategoría acá", icon: <FolderPlus size={12} />, variant: "primary", onClick: (nodo) => abrirNuevaSubcategoria(nodo.id), show: esCategoria },
    // Agregar producto solo en el último nivel — una categoría con
    // subcategorías es "de organización", el producto va en la hoja.
    { key: "agregar-producto", label: "Agregar producto acá", icon: <Plus size={12} />, variant: "success", onClick: (nodo) => abrirNuevoEnCategoria(nodo.id), show: (n) => esCategoria(n) && !tieneSubcategorias(n) },
    { key: "editar-categoria", label: "Editar categoría", icon: <Edit2 size={12} />, variant: "primary", onClick: abrirEditarCategoria, show: esCategoria },
    { key: "eliminar-categoria", label: "Eliminar categoría vacía", icon: <Trash2 size={12} />, variant: "danger", onClick: eliminarCategoriaNodo, show: (n) => esCategoria(n) && categoriaEsHoja(n) },
    { key: "editar", label: "Editar", icon: <Edit2 size={12} />, variant: "primary", onClick: abrirEditarProducto, show: esProducto },
    { key: "desactivar", label: "Desactivar", icon: <ShieldOff size={12} />, variant: "danger", onClick: toggleEstado, show: (n) => esProducto(n) && n.activo },
    { key: "activar", label: "Activar", icon: <ShieldCheck size={12} />, variant: "success", onClick: toggleEstado, show: (n) => esProducto(n) && !n.activo },
    { key: "eliminar-producto", label: "Eliminar producto", icon: <Trash2 size={12} />, variant: "danger", onClick: eliminarProductoNodo, show: esProducto },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Familias y categorías</h1>
            <p className="mt-0.5 text-sm text-slate-500">El árbol de familias con sus artículos. Para buscar y filtrar artículos usá «Artículos».</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <button
              type="button" onClick={abrirNuevaCategoriaRaiz}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              <FolderPlus size={14} /> Nueva categoría
            </button>
            <button
              type="button" onClick={() => setAjustePrecios({ masivo: true })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              <DollarSign size={14} /> Ajuste masivo
            </button>
            <button
              type="button" onClick={abrirNuevoProducto}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition"
            >
              <Plus size={14} /> Nuevo producto
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><FolderPlus size={12} className="text-slate-400" /> agrega una subcategoría (o categoría, si no elegís ninguna fila)</span>
          <span className="flex items-center gap-1"><Plus size={12} className="text-emerald-600" /> carga un producto nuevo ahí</span>
          <span className="flex items-center gap-1"><Edit2 size={12} className="text-blue-600" /> edita nombre, precio o datos</span>
          <span className="flex items-center gap-1"><ShieldOff size={12} className="text-rose-600" /> activa o desactiva sin borrar</span>
          <span className="flex items-center gap-1"><Trash2 size={12} className="text-rose-600" /> elimina (categoría solo si está vacía)</span>
        </div>

        <ErrorBanner message={errorCategorias || errorProducto} />

        {busquedaTotal > 100 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Se encontraron {busquedaTotal} resultados — mostrando los primeros 100. Refiná la búsqueda para ver el resto.
          </p>
        )}

        <TreeView
          items={treeItems}
          keyField="treeId"
          parentField="treeParentId"
          renderLabel={renderLabel}
          searchIn={(n) => n.nombre ?? ""}
          onQueryChange={onQueryChange}
          onExpandir={onExpandirNodo}
          loading={cargandoCategorias}
          searchable
          searchPlaceholder="Buscar producto…"
          emptyMessage="No hay categorías cargadas todavía."
          actions={actions}
        />

      </div>

      <ProductoFormModal
        key={productoEditar?.id ?? `nuevo-${categoriaPreseleccionada ?? "sin-categoria"}`}
        abierto={modalProductoAbierto}
        onClose={cerrarModalProducto}
        onGuardar={guardarProducto}
        productoEditar={productoEditar}
        guardando={guardandoProducto}
        error={modalProductoAbierto ? errorProducto : ""}
        opcionesCategoria={opcionesCategoria}
        categoriaInicial={categoriaPreseleccionada}
      />

      <CategoriaFormModal
        key={categoriaEditar?.id ?? `nueva-cat-${padrePreseleccionado ?? "raiz"}`}
        abierto={modalCategoriaAbierto}
        onClose={cerrarModalCategoria}
        onGuardar={guardarCategoria}
        categoriaEditar={categoriaEditar}
        guardando={guardandoCategoria}
        categorias={categorias}
        padreInicial={padrePreseleccionado}
      />

      {ajustePrecios && (
        <AjustePreciosModal
          productoFijo={ajustePrecios.producto}
          opcionesCategoria={opcionesCategoria}
          onClose={() => setAjustePrecios(null)}
          onAplicado={() => {}}
        />
      )}
    </div>
  );
}
