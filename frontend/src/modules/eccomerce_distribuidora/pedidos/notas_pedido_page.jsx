import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth/auth_context.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import SearchField from "../../../controls/ui/search_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import ActionButton from "../../../controls/ui/action_button.jsx";
import { ESTADOS, ESTADOS_PAGO } from "../../../config/order_config.js";
import { tienePermiso } from "../../../../../permisos_config.js";
import {
  getTodasLasNotasPedido, cambiarEstadoNotaPedido, registrarPagoNotaPedido, anularPagoNotaPedido, exportarNotaPedido,
  aceptarComprobante, rechazarComprobante,
} from "../api/nota_pedido_api.js";

const FILTROS_COMPROBANTE = [{ value: "por_revisar", label: "Comprobante para revisar" }, { value: "sin", label: "Sin comprobante" }];
import NotaPedidoCard from "./nota_pedido_card.jsx";

export default function NotasPedidoDistribuidoraPage() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = { q: params.get("q") || "", estado: params.get("estado") || "", estado_pago: params.get("estado_pago") || "", comprobante: params.get("comprobante") || "", pagina: Math.max(1, parseInt(params.get("pagina"), 10) || 1) };
  // El servidor es quien autoriza; esto solo evita mostrar acciones que van a fallar.
  const puedeCobrar = tienePermiso(usuario, "cobros.gestionar");
  const puedeCambiarEstado = tienePermiso(usuario, "pedidos.gestionar");
  const query = useQuery({ queryKey: ["gestion-pedidos", usuario?.usuario_id, filters], queryFn: () => getTodasLasNotasPedido(filters), refetchInterval: 30000 });
  function filter(key, value) {
    setParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== "pagina") next.delete("pagina"); return next; }, { replace: true });
  }
  async function mutate(fn, ...args) {
    try { await fn(...args); } finally { await query.refetch(); }
  }
  const data = query.data;
  return <main className="min-h-screen bg-slate-50 px-3 py-6 sm:p-8">
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Notas de pedido</h1><p className="mt-1 text-sm text-slate-600">Revisá las solicitudes, coordiná la entrega y registrá los cobros recibidos.</p></div>
        <ActionButton disabled={query.isFetching} onClick={() => query.refetch()}>{query.isFetching ? "Actualizando…" : "Actualizar"}</ActionButton>
      </div>
      <div className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchField value={filters.q} onSearch={(q) => filter("q", q)} label="Buscar pedidos" placeholder="Número, cliente o email" />
        <SelectField name="order-state" label="Estado del pedido" placeholder="Todos los estados" value={filters.estado} onChange={(e) => filter("estado", e.target.value)} options={Object.entries(ESTADOS).map(([value, s]) => ({ value, label: s.label }))} />
        <SelectField name="payment-state" label="Estado del cobro" placeholder="Todos los cobros" value={filters.estado_pago} onChange={(e) => filter("estado_pago", e.target.value)} options={Object.entries(ESTADOS_PAGO).map(([value, s]) => ({ value, label: s.label }))} />
        <SelectField name="receipt-state" label="Comprobante" placeholder="Todos" value={filters.comprobante} onChange={(e) => filter("comprobante", e.target.value)} options={FILTROS_COMPROBANTE} />
      </div>
      {query.isError && <ErrorBanner message={query.error.response?.data?.mensaje || "No se pudieron actualizar los pedidos. Reintentá con Actualizar."} />}
      {query.isPending && <p role="status">Cargando pedidos…</p>}
      {data && <p className="text-sm text-slate-500" role="status">{data.total} pedidos · Actualización automática cada 30 segundos</p>}
      {data?.data.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center">{filters.q || filters.estado || filters.estado_pago || filters.comprobante ? "No hay pedidos con estos filtros." : "Todavía no llegaron pedidos."}</p>}
      {data?.data.map((nota) => <NotaPedidoCard key={nota.id} nota={nota} operatorId={usuario?.usuario_id} puedeCobrar={puedeCobrar} puedeCambiarEstado={puedeCambiarEstado} onAceptarComprobante={(...args) => mutate(aceptarComprobante, ...args)} onRechazarComprobante={(...args) => mutate(rechazarComprobante, ...args)} onCambiarEstado={(...args) => mutate(cambiarEstadoNotaPedido, ...args)} onRegistrarPago={(...args) => mutate(registrarPagoNotaPedido, ...args)} onAnularPago={(...args) => mutate(anularPagoNotaPedido, ...args)} onExportar={exportarNotaPedido} />)}
      <Pagination page={data?.page || filters.pagina} pages={data?.totalPages || 0} total={data?.total || 0} disabled={query.isFetching} onChange={(p) => filter("pagina", String(p))} />
    </div>
  </main>;
}
