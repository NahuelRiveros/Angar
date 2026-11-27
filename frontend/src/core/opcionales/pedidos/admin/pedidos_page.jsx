import { Link } from "react-router-dom";
import { ChevronRight, ReceiptText, Store, Truck } from "lucide-react";
import Pagination from "../../../controls/ui/pagination.jsx";
import SearchField from "../../../controls/ui/search_field.jsx";
import { formatearPrecio } from "../../../utils/dinero.js";
import { Encabezado, Pantalla, SegunConsulta } from "../../../controls/ui/pantalla_panel.jsx";
import { useFiltrosUrl } from "../../../hooks/use_filtros_url.js";
import Etiqueta from "../../../controls/ui/etiqueta.jsx";
import { NOMBRE_ESTADO, TONO_ESTADO, fechaHora } from "../estados.js";
import { usePedidosPanel } from "../hooks.js";

const PESTANIAS = ["recibido", "confirmado", "listo", "entregado", "cancelado"];

/** MPE-10. */
export default function PedidosPage() {
  const { filtros, cambiar } = useFiltrosUrl(["estado", "q"]);
  const consulta = usePedidosPanel(filtros);
  const porEstado = consulta.data?.por_estado ?? {};
  const hayFiltros = Boolean(filtros.q || filtros.estado);
  return (
    <Pantalla>
      <Encabezado titulo="Pedidos" descripcion="Los que llegan de la web, del más nuevo al más viejo." />
      <SearchField value={filtros.q ?? ""} onSearch={(q) => cambiar({ q })} label="Buscar pedidos" placeholder="Número, nombre o celular" />
      <nav aria-label="Estados" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          <Pestania activa={!filtros.estado} onClick={() => cambiar({ estado: "" })} texto="Todos" cantidad={Object.values(porEstado).reduce((a, b) => a + b, 0)} />
          {PESTANIAS.map((estado) => <Pestania key={estado} activa={filtros.estado === estado} onClick={() => cambiar({ estado })} texto={NOMBRE_ESTADO[estado]} cantidad={porEstado[estado] ?? 0} />)}
        </div>
      </nav>
      <SegunConsulta consulta={consulta} vacia={consulta.data?.items.length === 0} icono={ReceiptText}
        tituloVacio={hayFiltros ? "Ningún pedido coincide" : "Todavía no llegaron pedidos"} descripcionVacio={hayFiltros ? "Probá con otra búsqueda o estado." : "Cuando alguien compre en la web, aparece acá."}>
        {() => (
          <div aria-busy={consulta.isPlaceholderData} className={consulta.isPlaceholderData ? "opacity-60" : ""}>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {consulta.data.items.map((p) => <Fila key={p.numero} pedido={p} />)}
            </ul>
            {consulta.data.paginacion.totalPages > 1 && <Pagination page={consulta.data.paginacion.page} pages={consulta.data.paginacion.totalPages} total={consulta.data.paginacion.total} onChange={(page) => cambiar({ page: String(page) })} />}
          </div>
        )}
      </SegunConsulta>
    </Pantalla>
  );
}

function Pestania({ activa, onClick, texto, cantidad }) {
  return (
    <button type="button" aria-pressed={activa} onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${activa ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
      {texto}<span className={`rounded-full px-1.5 text-xs tabular-nums ${activa ? "bg-white/20" : "bg-slate-100"}`}>{cantidad}</span>
    </button>
  );
}

function Fila({ pedido: p }) {
  const Icono = p.entrega === "envio" ? Truck : Store;
  return (
    <li>
      <Link to={`/admin/pedidos/${p.numero}`} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 sm:px-4">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">#{p.numero}</span>
            <span className="truncate font-semibold text-slate-900">{p.nombre}</span>
            <Etiqueta tono={TONO_ESTADO[p.estado]}>{NOMBRE_ESTADO[p.estado]}</Etiqueta>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
            <span>{fechaHora(p.creado_en)}</span><span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1"><Icono size={14} aria-hidden="true" />{p.entrega === "envio" ? "Envío" : "Retira"}</span><span aria-hidden="true">·</span>
            <span>{p.unidades} {p.unidades === 1 ? "unidad" : "unidades"}</span>
          </span>
        </span>
        <span className="font-bold tabular-nums text-slate-900">{formatearPrecio(p.total)}</span>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-400" />
      </Link>
    </li>
  );
}
