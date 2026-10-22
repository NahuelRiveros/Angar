import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Edit2, FolderTree, Package, Plus, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import SearchField from "../../../controls/ui/search_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import ComboboxField from "../../../controls/ui/combobox_field.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { cantidadConUnidad, describirBulto, textoBultos } from "../../../../../unidades_config.js";
import { getCategorias } from "../api/categoria_distribuidora_api.js";
import { getProductos, cambiarEstadoProducto, eliminarProducto } from "../api/producto_distribuidora_api.js";
import { listarMarcas } from "../api/marcas_distribuidora_api.js";
import { construirOpcionesCategoria } from "../utils/categoria_jerarquia.js";
import { formatearPrecio } from "../utils/precio_iva.js";
import { rutaFichaArticulo } from "../utils/rutas_articulo.js";
import AjustePreciosModal from "./ajuste_precios_modal.jsx";
import { useAuth } from "../../../auth/auth_context.jsx";
import { tienePermiso } from "../../../../../permisos_config.js";

const POR_PAGINA = 50;
const OPCIONES_ESTADO = [{ value: "activos", label: "Disponibles" }, { value: "inactivos", label: "No disponibles" }];
const OPCIONES_STOCK = [{ value: "bajo_minimo", label: "Stock bajo (mínimo)" }, { value: "sin_stock", label: "Sin stock" }];
const BOTON = "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition";

function EstadoStock({ v }) {
  if (!v) return <span className="text-xs font-semibold text-amber-700">Sin precio</span>;
  if (!v.controla_stock) return <span className="text-xs text-slate-500">No controla</span>;
  const cantidad = Number(v.cantidad);
  const bajo = Number(v.stock_minimo) > 0 && cantidad <= Number(v.stock_minimo);
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="font-semibold">{cantidadConUnidad(cantidad, v.unidad_medida)}</span>
      {Number(v.unidades_por_bulto) > 1 && cantidad > 0 && <span className="text-xs text-slate-500">= {textoBultos(cantidad, v)}</span>}
      {cantidad <= 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Sin stock</span>
        : bajo && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">Stock bajo · mín. {v.stock_minimo}</span>}
    </span>
  );
}

function Estado({ activo }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${activo ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
    {activo ? "Disponible" : "No disponible"}
  </span>;
}

function Acciones({ articulo, onEditar, onPrecio, onEstado, onEliminar }) {
  const icono = "flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100";
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={icono} onClick={() => onEditar(articulo)} aria-label={`Editar ${articulo.nombre}`} title="Editar ficha"><Edit2 size={17} /></button>
      {onPrecio && <button type="button" className={icono} onClick={() => onPrecio(articulo)} aria-label={`Ajustar precio de ${articulo.nombre}`} title="Ajustar precio"><DollarSign size={17} /></button>}
      <button type="button" className={icono} onClick={() => onEstado(articulo)} aria-label={`${articulo.activo ? "Desactivar" : "Activar"} ${articulo.nombre}`} title={articulo.activo ? "Desactivar" : "Activar"}>
        {articulo.activo ? <ShieldOff size={17} /> : <ShieldCheck size={17} />}
      </button>
      <button type="button" className={`${icono} hover:text-rose-700`} onClick={() => onEliminar(articulo)} aria-label={`Eliminar ${articulo.nombre}`} title="Eliminar"><Trash2 size={17} /></button>
    </div>
  );
}

/**
 * Gestión de artículos en tabla, como el listado del sistema del cliente: buscar por
 * código, código de barras, descripción o marca y filtrar por familia, marca, estado o stock.
 * Los filtros viven en la dirección: se pueden compartir y sobreviven al recargar.
 */
export default function ArticulosPage() {
  const { usuario } = useAuth();
  const puedeCambiarPrecios = tienePermiso(usuario, "precios.editar");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filtros = {
    q: params.get("q") ?? "", categoria: params.get("categoria") ?? "", marca: params.get("marca") ?? "",
    estado: params.get("estado") ?? "", stock: params.get("stock") ?? "",
    pagina: Math.max(1, Number(params.get("pagina")) || 1),
  };
  const hayFiltros = Boolean(filtros.q || filtros.categoria || filtros.marca || filtros.estado || filtros.stock);
  const actualizar = useCallback((cambios) => setParams((anterior) => {
    const siguiente = new URLSearchParams(anterior);
    for (const [clave, valor] of Object.entries({ pagina: null, ...cambios })) valor ? siguiente.set(clave, String(valor)) : siguiente.delete(clave);
    return siguiente;
  }), [setParams]);

  const articulos = useQuery({
    queryKey: ["gestion-articulos", filtros],
    queryFn: () => getProductos({
      q: filtros.q || undefined, categoria: filtros.categoria || undefined, marca: filtros.marca || undefined,
      estado: filtros.estado || undefined, stock: filtros.stock || undefined, pagina: filtros.pagina, por_pagina: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  });
  const categorias = useQuery({ queryKey: ["gestion-categorias"], queryFn: getCategorias, staleTime: 60_000 });
  // Con una familia o categoría elegida, el filtro de marca muestra solo las asociadas a ella.
  const marcas = useQuery({
    queryKey: ["gestion-marcas", filtros.categoria || null],
    queryFn: () => listarMarcas({ categoria: filtros.categoria || undefined }),
    staleTime: 60_000, placeholderData: keepPreviousData,
  });
  const opcionesMarca = useMemo(() => (marcas.data ?? []).map((m) => ({ value: m.nombre, label: m.nombre })), [marcas.data]);
  const opcionesCategoria = useMemo(() => construirOpcionesCategoria(categorias.data ?? []), [categorias.data]);

  const navigate = useNavigate();
  const location = useLocation();
  const [ajuste, setAjuste] = useState(null); // null | { producto } | { masivo: true }
  const [confirmar, setConfirmar] = useState(null); // null | { tipo, articulo }

  const refrescar = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["gestion-articulos"] }),
    queryClient.invalidateQueries({ queryKey: ["gestion-marcas"] }),
    queryClient.invalidateQueries({ queryKey: ["gestion-marcas-resumen"] }),
    queryClient.invalidateQueries({ queryKey: ["marcas-familia"] }),
    queryClient.invalidateQueries({ queryKey: ["panel-resumen"] }),
  ]);

  const accion = useMutation({
    mutationFn: ({ tipo, articulo }) => (tipo === "eliminar" ? eliminarProducto(articulo.id) : cambiarEstadoProducto(articulo.id, !articulo.activo)),
    onSuccess: async (r) => { toast.success(r?.mensaje || "Listo"); setConfirmar(null); await refrescar(); },
    onError: (e) => { toast.error(e.response?.data?.mensaje || "No se pudo completar la acción."); setConfirmar(null); },
  });

  // La ficha es una página: al guardar o cancelar vuelve acá con los mismos filtros y página.
  const abrirFicha = (articulo = null) => navigate(rutaFichaArticulo({
    id: articulo?.id, volver: location.pathname + location.search, familia: articulo ? null : filtros.categoria,
  }));
  const filas = articulos.data?.data ?? [];
  const acciones = { onEditar: abrirFicha, onPrecio: puedeCambiarPrecios ? (producto) => setAjuste({ producto }) : undefined, onEstado: (articulo) => setConfirmar({ tipo: "estado", articulo }), onEliminar: (articulo) => setConfirmar({ tipo: "eliminar", articulo }) };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Artículos</h1>
          <p className="text-sm text-(--kt-ink-soft)">Buscá por código, código de barras, descripción o marca.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/distribuidora/admin/categorias" className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><FolderTree size={16} /> Familias</Link>
          {puedeCambiarPrecios && <button type="button" onClick={() => setAjuste({ masivo: true })} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><DollarSign size={16} /> Ajuste masivo</button>}
          <button type="button" onClick={() => abrirFicha()} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}><Plus size={16} /> Nuevo artículo</button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <SearchField value={filtros.q} onSearch={(q) => actualizar({ q })} label="Buscar artículos" placeholder="Código, barras, descripción o marca" />
        <ComboboxField label="Familia o categoría" vacioLabel="Todas" options={opcionesCategoria} value={filtros.categoria} onChange={(categoria) => actualizar({ categoria, marca: null })} />
        <ComboboxField label="Marca" vacioLabel="Todas" options={opcionesMarca} value={filtros.marca} onChange={(marca) => actualizar({ marca })} etiquetaSeleccionada={filtros.marca}
          helperText={filtros.categoria ? "Marcas de la familia o categoría elegida." : undefined} />
        <SelectField label="Estado" placeholder="Todos" options={OPCIONES_ESTADO} value={filtros.estado} onChange={(e) => actualizar({ estado: e.target.value })} />
        <SelectField label="Stock" placeholder="Todo" options={OPCIONES_STOCK} value={filtros.stock} onChange={(e) => actualizar({ stock: e.target.value })} />
      </div>

      {articulos.isError && (
        <div className="space-y-2">
          <ErrorBanner message="No pudimos cargar los artículos." />
          <button type="button" onClick={() => articulos.refetch()} className={`${BOTON} border border-slate-300 bg-white`}>Reintentar</button>
        </div>
      )}

      {articulos.isPending ? <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>
        : !articulos.isError && (filas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <AdminEmptyState icon={Package} title={hayFiltros ? "No hay artículos con estos filtros." : "Todavía no cargaste artículos."}
              action={hayFiltros
                ? <button type="button" onClick={() => setParams({})} className={`${BOTON} border border-slate-300`}>Limpiar filtros</button>
                : <button type="button" onClick={() => abrirFicha()} className={`${BOTON} bg-(--kt-petrol) text-white`}><Plus size={16} /> Nuevo artículo</button>} />
          </div>
        ) : (
          <section aria-label="Listado de artículos" aria-busy={articulos.isFetching} className="space-y-2">
            <p className="text-sm text-slate-600">{articulos.data.total} artículo(s)</p>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                  <tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">Artículo</th><th className="px-3 py-2">Familia</th><th className="px-3 py-2 text-right">Precio</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2"><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.map((a) => {
                    const v = a.variedades?.[0];
                    return (
                      <tr key={a.id} className={a.activo ? "" : "bg-slate-50/60 text-slate-500"}>
                        <td className="px-3 py-2 font-mono text-xs">{v?.cod_ref ?? "—"}{v?.codigo_barras && <span className="block text-slate-400">{v.codigo_barras}</span>}</td>
                        <td className="px-3 py-2"><span className="font-semibold text-(--kt-ink)">{a.nombre}</span>
                          <span className="block text-xs text-slate-500">{[a.marca, v && describirBulto(v)].filter(Boolean).join(" · ")}</span></td>
                        <td className="px-3 py-2 text-xs">{a.categoria?.nombre}</td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{v ? formatearPrecio(v.precio) : "—"}</td>
                        <td className="px-3 py-2"><EstadoStock v={v} /></td>
                        <td className="px-3 py-2"><Estado activo={a.activo} /></td>
                        <td className="px-1 py-1"><Acciones articulo={a} {...acciones} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 md:hidden">
              {filas.map((a) => {
                const v = a.variedades?.[0];
                return (
                  <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-slate-500">{v?.cod_ref ?? "Sin código"} · {a.categoria?.nombre}</p>
                        <p className="font-semibold text-(--kt-ink)">{a.nombre}</p>
                        <p className="text-xs text-slate-500">{[a.marca, v && describirBulto(v)].filter(Boolean).join(" · ")}</p>
                      </div>
                      <p className="shrink-0 font-bold">{v ? formatearPrecio(v.precio) : "—"}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2"><EstadoStock v={v} /><Estado activo={a.activo} /></div>
                      <Acciones articulo={a} {...acciones} />
                    </div>
                  </li>
                );
              })}
            </ul>

            <Pagination page={filtros.pagina} pages={articulos.data.total_paginas} total={articulos.data.total} disabled={articulos.isFetching}
              onChange={(pagina) => { actualizar({ pagina }); window.scrollTo({ top: 0, behavior: "instant" }); }} />
          </section>
        ))}

      {ajuste && (
        <AjustePreciosModal productoFijo={ajuste.producto} opcionesCategoria={opcionesCategoria} onClose={() => setAjuste(null)} onAplicado={refrescar} />
      )}
      <ConfirmDialog
        open={!!confirmar}
        title={confirmar?.tipo === "eliminar" ? "Eliminar artículo" : confirmar?.articulo?.activo ? "Desactivar artículo" : "Activar artículo"}
        message={confirmar?.tipo === "eliminar"
          ? `¿Eliminar "${confirmar?.articulo?.nombre}"? Deja de verse en la gestión y en el catálogo. Los pedidos ya hechos no cambian.`
          : confirmar?.articulo?.activo ? `"${confirmar?.articulo?.nombre}" deja de mostrarse en el catálogo de clientes.` : `"${confirmar?.articulo?.nombre}" vuelve a mostrarse en el catálogo.`}
        confirmLabel={confirmar?.tipo === "eliminar" ? "Eliminar" : confirmar?.articulo?.activo ? "Desactivar" : "Activar"}
        variant={confirmar?.tipo === "eliminar" || confirmar?.articulo?.activo ? "danger" : "primary"}
        onConfirm={() => accion.mutate(confirmar)}
        onClose={() => !accion.isPending && setConfirmar(null)}
      />
    </div>
  );
}
