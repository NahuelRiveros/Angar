import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/auth_context.jsx";
import { orderConfig } from "../../../config/order_config.js";
import { storefrontConfig } from "../../../config/storefront_config.js";
import OrderSummary from "../../../controls/pedidos/order_summary.jsx";
import { money } from "../../../controls/pedidos/order_format.js";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import ActionButton from "../../../controls/ui/action_button.jsx";
import { cancelarMiNotaPedido, getMisNotasPedido } from "../api/nota_pedido_api.js";
import { useCarritoDistribuidora } from "./carrito_context.jsx";
import CancelarPedidoModal from "./cancelar_pedido_modal.jsx";
import PagoTransferencia from "../pedidos/pago_transferencia.jsx";
export default function MisPedidosPage() {
  const { usuario } = useAuth();
  const cart = useCarritoDistribuidora();
  const queryClient = useQueryClient();
  const [cancelando, setCancelando] = useState(null);
  const [aviso, setAviso] = useState(null);
  const query = useQuery({ queryKey: ["mis-pedidos", usuario?.usuario_id], queryFn: getMisNotasPedido, refetchInterval: 30000 });
  const cancelar = useMutation({
    mutationFn: ({ id, ...datos }) => cancelarMiNotaPedido(id, datos),
    onSuccess: async (respuesta, { volverAlCarrito }) => {
      setCancelando(null);
      setAviso({ mensaje: respuesta.mensaje, omitidos: respuesta.omitidos ?? [], volverAlCarrito });
      if (volverAlCarrito) await cart.recargar().catch(() => {});
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["mis-pedidos"] }),
  });
  function abrirCancelacion(nota) { cancelar.reset(); setAviso(null); setCancelando(nota); }
  return <main className="min-h-screen bg-slate-50 px-3 py-6 sm:p-8">
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">Mis pedidos</h1><ActionButton disabled={query.isFetching} onClick={() => query.refetch()}>Actualizar</ActionButton></div>
      <p className="text-sm text-slate-600">{storefrontConfig.labels.orderNotice}</p>
      {aviso && <div role="status" className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">{aviso.mensaje}</p>
        {aviso.omitidos.length > 0 && <>
          <p>Algunos productos no volvieron completos porque ya no hay disponibilidad:</p>
          <ul className="list-disc pl-5">{aviso.omitidos.map((o, i) => <li key={i}>{o.nombre}: pediste {o.pedido}, {o.cargado ? `cargamos ${o.cargado}` : "no se pudo cargar"}</li>)}</ul>
        </>}
        {aviso.volverAlCarrito && <Link className="inline-flex min-h-11 items-center font-bold underline" to={storefrontConfig.cartPath}>Ir al carrito</Link>}
      </div>}
      {query.isError && <ErrorBanner message="No pudimos actualizar tus pedidos. Reintentá con Actualizar." />}
      {query.isPending && <p role="status">Cargando pedidos…</p>}
      {query.data?.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center"><p>Todavía no enviaste ningún pedido.</p><Link className="mt-3 inline-flex min-h-11 items-center font-bold underline" to={storefrontConfig.catalogPath}>Ver productos</Link></div>}
      {query.data?.map((nota) => <article key={nota.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div><h2 className="font-bold">Pedido #{nota.id}</h2><p className="text-xs text-slate-500">{new Date(nota.fecha_alta).toLocaleString("es-AR")}</p></div>
          <OrderSummary order={nota} />
        </div>
        <details className="border-t pt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Ver productos y entrega</summary>
          <ul className="space-y-2 text-sm">{nota.items?.map((item) => <li className="flex flex-wrap justify-between gap-2" key={item.id}><span>{item.cantidad} × {item.nombre_producto}{item.variedad_nombre ? " (" + item.variedad_nombre + ")" : ""}</span><span>{money(item.subtotal)}</span></li>)}</ul>
          <p className="mt-3 break-words text-sm">Entrega: {[nota.direccion, nota.localidad, nota.departamento, nota.provincia, nota.codigo_postal].filter(Boolean).join(", ")}</p>
          {nota.notas && <p className="mt-2 whitespace-pre-wrap break-words text-sm">Observaciones: {nota.notas}</p>}
        </details>
        {(nota.estado !== "cancelada" || nota.comprobantes?.length > 0) && <div className="border-t pt-3"><PagoTransferencia nota={nota} comprobantes={nota.comprobantes ?? []} onSubido={() => queryClient.invalidateQueries({ queryKey: ["mis-pedidos"] })} /></div>}
        {orderConfig.buyerCancelableStates.includes(nota.estado) && <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-xs text-slate-500">Podés cancelarlo o cambiarlo hasta que lo confirmemos.</p>
          <button type="button" onClick={() => abrirCancelacion(nota)} className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50">Cancelar o cambiar pedido</button>
        </div>}
      </article>)}
    </div>
    {cancelando && <CancelarPedidoModal nota={cancelando} busy={cancelar.isPending}
      error={cancelar.error ? cancelar.error.response?.data?.mensaje || "No se pudo cancelar el pedido. Reintentá." : ""}
      onClose={() => setCancelando(null)} onCancelar={(datos) => cancelar.mutate({ id: cancelando.id, ...datos })} />}
  </main>;
}
