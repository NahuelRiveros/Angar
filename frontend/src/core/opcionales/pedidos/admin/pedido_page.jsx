import { useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Phone, RotateCw } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import ConfirmarConMotivo from "../../../controls/ui/confirmar_con_motivo.jsx";
import { cumpleAcceso } from "../../../controls/acceso/acceso.js";
import { useToast } from "../../../controls/toast/use_toast.js";
import { formatearPrecio } from "../../../utils/dinero.js";
import { mensajeError } from "../../../utils/errores.js";
import ActionButton from "../../../controls/ui/action_button.jsx";
import { Encabezado, Pantalla, SegunConsulta, Tarjeta } from "../../../controls/ui/pantalla_panel.jsx";
import Etiqueta from "../../../controls/ui/etiqueta.jsx";
import { NOMBRE_ENTREGA, NOMBRE_ESTADO, TONO_ESTADO, textoPaso } from "../estados.js";
import { useCambiarEstado, usePedidoPanel } from "../hooks.js";
import { formatearFechaHora } from "../../../utils/formatear_fecha.js";

const VOLVER = <ActionButton variante="secundario" to="/admin/pedidos"><ArrowLeft size={16} aria-hidden="true" /> Pedidos</ActionButton>;

export default function PedidoPage() {
  const { id } = useParams();
  const consulta = usePedidoPanel(id);
  return (
    <Pantalla>
      <SegunConsulta consulta={consulta}>
        {() => <Detalle pedido={consulta.data} onActualizar={() => consulta.refetch()} />}
      </SegunConsulta>
    </Pantalla>
  );
}

function Detalle({ pedido, onActualizar }) {
  const { usuario } = useAuth();
  const toast = useToast();
  const cambiar = useCambiarEstado();
  const [conMotivo, setConMotivo] = useState(null);
  const [desactualizado, setDesactualizado] = useState(null);
  const puedeGestionar = cumpleAcceso(usuario, { permisos: ["pedidos.gestionar"] });

  /** MPE-08: si otra persona lo cambió, se avisa y se ofrece actualizar en vez de pisarlo. */
  async function aplicar(paso, motivo = null) {
    try {
      await cambiar.mutateAsync({ id: pedido.id, estado: paso.estado, motivo, version: pedido.version });
      toast.success(`Pedido #${pedido.numero}: ${NOMBRE_ESTADO[paso.estado]}.`);
      setConMotivo(null);
      setDesactualizado(null);
    } catch (error) {
      if (error.response?.data?.codigo === "CAMBIO_SIMULTANEO") {
        setConMotivo(null);
        setDesactualizado(error.response.data.mensaje);
        return;
      }
      if (paso.pideMotivo) throw error;
      toast.error(mensajeError(error, "No se pudo cambiar el estado."));
    }
  }

  const avanzar = pedido.siguientes.find((s) => s.tipo === "avanzar");
  const otros = pedido.siguientes.filter((s) => s.tipo !== "avanzar");
  return (
    <>
      <Encabezado titulo={`Pedido #${pedido.numero}`} descripcion={`${formatearFechaHora(pedido.creado_en)} · ${NOMBRE_ENTREGA[pedido.entrega]}`}>{VOLVER}</Encabezado>
      <p><Etiqueta tono={TONO_ESTADO[pedido.estado]} grande>{NOMBRE_ESTADO[pedido.estado]}</Etiqueta></p>
      {desactualizado && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">{desactualizado}</p>
          <ActionButton variante="secundario" onClick={() => { setDesactualizado(null); onActualizar(); }}><RotateCw size={16} aria-hidden="true" /> Actualizar</ActionButton>
        </div>
      )}
      {puedeGestionar && pedido.siguientes.length > 0 && !desactualizado && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {avanzar && <ActionButton cargando={cambiar.isPending && !conMotivo} disabled={cambiar.isPending} onClick={() => aplicar(avanzar)}>{textoPaso(avanzar)}</ActionButton>}
          {otros.map((paso) => (
            <ActionButton key={paso.estado} variante={paso.tipo === "cancelar" ? "peligro" : "secundario"} disabled={cambiar.isPending} onClick={() => setConMotivo(paso)}>{textoPaso(paso)}</ActionButton>
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Tarjeta titulo="Productos">
          <ul className="divide-y divide-slate-100">
            {pedido.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 py-2">
                <span>
                  <span className="font-semibold">{item.cantidad} × {item.producto_nombre}</span>
                  {item.variante_nombre && <span className="text-slate-600"> ({item.variante_nombre})</span>}
                  <span className="block text-sm text-slate-600">{[item.codigo, `${formatearPrecio(item.precio)} c/u`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatearPrecio(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3 text-lg"><span className="font-semibold">Total</span><span className="font-extrabold tabular-nums">{formatearPrecio(pedido.total)}</span></p>
        </Tarjeta>
        <Tarjeta titulo="Cliente">
          <dl className="space-y-2 text-sm">
            <Dato nombre="Nombre">{pedido.nombre}</Dato>
            <Dato nombre="Celular"><a href={`tel:${pedido.celular}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-(--kt-teal-700) hover:underline"><Phone size={14} aria-hidden="true" />{pedido.celular}</a></Dato>
            <Dato nombre="Entrega">{NOMBRE_ENTREGA[pedido.entrega]}</Dato>
            {pedido.entrega === "envio" && <Dato nombre="Dirección">{pedido.direccion}, {pedido.localidad}</Dato>}
            {pedido.nota && <Dato nombre="Comentario"><span className="whitespace-pre-line">{pedido.nota}</span></Dato>}
            <Dato nombre="Cuenta">{pedido.usuario_id ? "Lo hizo con su cuenta" : "Sin cuenta"}</Dato>
          </dl>
        </Tarjeta>
      </div>
      <Tarjeta titulo="Historial">
        <ol className="space-y-3">
          {pedido.historial.map((h, i) => (
            <li key={i} className="text-sm">
              <span className="font-semibold">{h.de ? `${NOMBRE_ESTADO[h.de]} → ${NOMBRE_ESTADO[h.a]}` : "Pedido recibido"}</span>
              <span className="text-slate-600"> · {formatearFechaHora(h.creado_en)} · {h.persona ?? (h.de ? "Sistema" : "Desde la web")}</span>
              {h.motivo && <span className="block text-slate-700">Motivo: {h.motivo}</span>}
            </li>
          ))}
        </ol>
      </Tarjeta>
      {conMotivo && <ConfirmarConMotivo titulo={`${textoPaso(conMotivo)} · pedido #${pedido.numero}`} textoConfirmar={textoPaso(conMotivo)} peligro={conMotivo.tipo === "cancelar"}
        ayuda="Queda en el historial del pedido." onConfirmar={(motivo) => aplicar(conMotivo, motivo)} onClose={() => setConMotivo(null)} />}
    </>
  );
}

function Dato({ nombre, children }) {
  return <div><dt className="text-slate-500">{nombre}</dt><dd className="font-medium text-slate-900">{children}</dd></div>;
}
