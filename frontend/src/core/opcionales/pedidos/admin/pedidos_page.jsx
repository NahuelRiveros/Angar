import { ReceiptText, Store, Truck } from "lucide-react";
import Etiqueta from "../../../controls/ui/etiqueta.jsx";
import FilaLista, { Lista } from "../../../controls/ui/fila_lista.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import Pestanas from "../../../controls/ui/pestanas.jsx";
import SearchField from "../../../controls/ui/search_field.jsx";
import { Encabezado, Pantalla, SegunConsulta } from "../../../controls/ui/pantalla_panel.jsx";
import { useFiltrosUrl } from "../../../hooks/use_filtros_url.js";
import { formatearPrecio } from "../../../utils/dinero.js";
import { formatearFechaHora } from "../../../utils/formatear_fecha.js";
import { NOMBRE_ESTADO, TONO_ESTADO } from "../estados.js";
import { usePedidosPanel } from "../hooks.js";

const ESTADOS = ["recibido", "confirmado", "listo", "entregado", "cancelado"];

/** MPE-10. */
export default function PedidosPage() {
  const { filtros, cambiar } = useFiltrosUrl(["estado", "q"]);
  const consulta = usePedidosPanel(filtros);
  const porEstado = consulta.data?.por_estado ?? {};
  const hayFiltros = Boolean(filtros.q || filtros.estado);
  const pestanas = [
    { valor: "", texto: "Todos", cantidad: Object.values(porEstado).reduce((a, b) => a + b, 0) },
    ...ESTADOS.map((estado) => ({ valor: estado, texto: NOMBRE_ESTADO[estado], cantidad: porEstado[estado] ?? 0 })),
  ];
  return (
    <Pantalla>
      <Encabezado titulo="Pedidos" descripcion="Los que llegan de la web, del más nuevo al más viejo." />
      <SearchField value={filtros.q ?? ""} onSearch={(q) => cambiar({ q })} label="Buscar pedidos" placeholder="Número, nombre o celular" />
      <Pestanas etiqueta="Estados" opciones={pestanas} valor={filtros.estado ?? ""} onCambiar={(estado) => cambiar({ estado })} />
      <SegunConsulta consulta={consulta} vacia={consulta.data?.items.length === 0} icono={ReceiptText}
        tituloVacio={hayFiltros ? "Ningún pedido coincide" : "Todavía no llegaron pedidos"} descripcionVacio={hayFiltros ? "Probá con otra búsqueda o estado." : "Cuando alguien compre en la web, aparece acá."}>
        {() => (
          <div aria-busy={consulta.isPlaceholderData} className={consulta.isPlaceholderData ? "opacity-60" : ""}>
            <Lista>{consulta.data.items.map((p) => <Fila key={p.numero} pedido={p} />)}</Lista>
            {consulta.data.paginacion.totalPages > 1 && <Pagination page={consulta.data.paginacion.page} pages={consulta.data.paginacion.totalPages} total={consulta.data.paginacion.total} onChange={(page) => cambiar({ page: String(page) })} />}
          </div>
        )}
      </SegunConsulta>
    </Pantalla>
  );
}

function Fila({ pedido: p }) {
  const Icono = p.entrega === "envio" ? Truck : Store;
  return (
    <FilaLista to={`/admin/pedidos/${p.numero}`} titulo={`#${p.numero} ${p.nombre}`} extra={formatearPrecio(p.total)}
      etiquetas={<Etiqueta tono={TONO_ESTADO[p.estado]}>{NOMBRE_ESTADO[p.estado]}</Etiqueta>}
      subtitulo={<span className="flex flex-wrap items-center gap-x-2">
        <span>{formatearFechaHora(p.creado_en)}</span><span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1"><Icono size={14} aria-hidden="true" />{p.entrega === "envio" ? "Envío" : "Retira"}</span><span aria-hidden="true">·</span>
        <span>{p.unidades} {p.unidades === 1 ? "unidad" : "unidades"}</span>
      </span>} />
  );
}
