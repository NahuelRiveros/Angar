import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import { useToast } from "../../../controls/toast/use_toast.js";
import { imagenCloudinary } from "../../../utils/imagen_cloudinary.js";
import Buscador from "../../comun/buscador.jsx";
import { formatearPrecio, tienePrecio } from "../../comun/dinero.js";
import { mensajeError } from "../../comun/errores.js";
import { BOTON_PELIGRO, BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from "../../comun/estilos.js";
import { Encabezado, Pantalla, SegunConsulta } from "../../comun/piezas_panel.jsx";
import { useFiltrosUrl } from "../../comun/use_filtros_url.js";
import { opcionesCategorias } from "../arbol.js";
import { useCategoriasPanel, useEliminarProducto, useProductosPanel } from "../hooks.js";

const NUEVO = <Link to="/admin/catalogo/productos/nuevo" className={BOTON_PRIMARIO}><Plus size={16} aria-hidden="true" /> Nuevo producto</Link>;

export default function ProductosPage() {
  const toast = useToast();
  const { filtros, cambiar } = useFiltrosUrl(["q", "categoria_id", "estado"]);
  const consulta = useProductosPanel(filtros);
  const categorias = useCategoriasPanel();
  const eliminar = useEliminarProducto();
  const [aBorrar, setABorrar] = useState(null);
  const hayFiltros = Boolean(filtros.q || filtros.categoria_id || filtros.estado);

  async function borrar() {
    try { toast.success((await eliminar.mutateAsync(aBorrar.id)).mensaje); }
    catch (error) { toast.error(mensajeError(error, "No se pudo dar de baja.")); }
    setABorrar(null);
  }

  return (
    <Pantalla>
      <Encabezado titulo="Productos" descripcion="Lo que se ve en el catálogo de la web.">{NUEVO}</Encabezado>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Buscador valor={filtros.q} onBuscar={(q) => cambiar({ q })} etiqueta="Buscar productos" placeholder="Nombre o código" />
        <select aria-label="Categoría" value={filtros.categoria_id ?? ""} onChange={(e) => cambiar({ categoria_id: e.target.value })} className={`${CAMPO} sm:max-w-60`}>
          <option value="">Todas las categorías</option>
          {opcionesCategorias(categorias.data).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select aria-label="Estado" value={filtros.estado ?? ""} onChange={(e) => cambiar({ estado: e.target.value })} className={CAMPO}>
          <option value="">Todos</option><option value="visibles">Se ven en la web</option><option value="ocultos">Ocultos</option><option value="sin_stock">Sin stock</option>
        </select>
      </div>
      <SegunConsulta consulta={consulta} vacia={consulta.data?.items.length === 0} icono={Package} tituloVacio={hayFiltros ? "Ningún producto coincide" : "Todavía no hay productos"}
        descripcionVacio={hayFiltros ? "Probá con otra búsqueda." : "Cargá el primero con su foto y precio."} accionVacio={hayFiltros ? null : NUEVO}>
        {() => (
          <>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {consulta.data.items.map((p) => <Fila key={p.id} producto={p} onBorrar={() => setABorrar(p)} />)}
            </ul>
            {consulta.data.paginacion.totalPages > 1 && <Pagination page={consulta.data.paginacion.page} pages={consulta.data.paginacion.totalPages} total={consulta.data.paginacion.total} onChange={(page) => cambiar({ page: String(page) })} />}
          </>
        )}
      </SegunConsulta>
      <ConfirmDialog open={Boolean(aBorrar)} title={`¿Dar de baja "${aBorrar?.nombre ?? ""}"?`} message="Deja de verse en la web y en el panel. Si solo querés esconderlo, editalo y destildá «Se ve en la web»." confirmLabel="Dar de baja" loading={eliminar.isPending} onConfirm={borrar} onClose={() => setABorrar(null)} />
    </Pantalla>
  );
}

function Fila({ producto: p, onBorrar }) {
  const precio = tienePrecio(p.precio) ? `${p.desde ? "Desde " : ""}${formatearPrecio(p.precio)}` : "Consultar precio";
  const marcas = [!p.activo && "Oculto", p.categoria_oculta && "Categoría oculta", !p.disponible && "Sin stock", p.destacado && "Destacado"].filter(Boolean);
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {p.foto ? <img src={imagenCloudinary(p.foto, 120)} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Package size={24} aria-hidden="true" className="text-slate-400" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{p.nombre}</span>
        <span className="block text-sm text-slate-600">{[p.categoria, precio, p.opciones > 1 && `${p.opciones} opciones`].filter(Boolean).join(" · ")}</span>
        {marcas.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{marcas.map((m) => <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{m}</span>)}</span>}
      </span>
      <span className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <Link to={`/admin/catalogo/productos/${p.id}`} aria-label={`Editar ${p.nombre}`} className={BOTON_SECUNDARIO}><Pencil size={16} aria-hidden="true" /></Link>
        <button type="button" onClick={onBorrar} aria-label={`Dar de baja ${p.nombre}`} className={BOTON_PELIGRO}><Trash2 size={16} aria-hidden="true" /></button>
      </span>
    </li>
  );
}
