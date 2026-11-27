import { useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import ActionButton from "../../../controls/ui/action_button.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import FilaLista, { Lista } from "../../../controls/ui/fila_lista.jsx";
import Etiqueta from "../../../controls/ui/etiqueta.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import { useToast } from "../../../controls/toast/use_toast.js";
import { imagenCloudinary } from "../../../utils/imagen_cloudinary.js";
import SearchField from "../../../controls/ui/search_field.jsx";
import { formatearPrecio, tienePrecio } from "../../../utils/dinero.js";
import { mensajeError } from "../../../utils/errores.js";
import { CAMPO } from "../../../controls/ui/estilos.js";
import { Encabezado, Pantalla, SegunConsulta } from "../../../controls/ui/pantalla_panel.jsx";
import { useFiltrosUrl } from "../../../hooks/use_filtros_url.js";
import { opcionesCategorias } from "../arbol.js";
import { useCategoriasPanel, useEliminarProducto, useProductosPanel } from "../hooks.js";

const NUEVO = <ActionButton to="/admin/catalogo/productos/nuevo"><Plus size={16} aria-hidden="true" /> Nuevo producto</ActionButton>;

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
        <SearchField value={filtros.q ?? ""} onSearch={(q) => cambiar({ q })} label="Buscar productos" placeholder="Nombre o código" />
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
            <Lista>{consulta.data.items.map((p) => <Fila key={p.id} producto={p} onBorrar={() => setABorrar(p)} />)}</Lista>
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
    <FilaLista imagen={p.foto ? imagenCloudinary(p.foto, 120) : null} icono={Package} titulo={p.nombre}
      subtitulo={[p.categoria, precio, p.opciones > 1 && `${p.opciones} opciones`].filter(Boolean).join(" · ")}
      etiquetas={marcas.length > 0 && marcas.map((m) => <Etiqueta key={m}>{m}</Etiqueta>)}
      acciones={<>
        <ActionButton variante="secundario" to={`/admin/catalogo/productos/${p.id}`} aria-label={`Editar ${p.nombre}`}><Pencil size={16} aria-hidden="true" /></ActionButton>
        <ActionButton variante="peligro" onClick={onBorrar} aria-label={`Dar de baja ${p.nombre}`}><Trash2 size={16} aria-hidden="true" /></ActionButton>
      </>} />
  );
}
