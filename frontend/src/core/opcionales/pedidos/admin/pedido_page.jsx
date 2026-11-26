import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, RotateCw } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { cumpleAcceso } from "../../../controls/acceso/acceso.js";
import FormError from "../../../controls/ui/form_error.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";
import { useToast } from "../../../controls/toast/use_toast.js";
import { formatearPrecio } from "../../comun/dinero.js";
import { mensajeError } from "../../comun/errores.js";
import { BOTON_PELIGRO, BOTON_PRIMARIO, BOTON_SECUNDARIO } from "../../comun/estilos.js";
import { Encabezado, Pantalla, SegunConsulta, Tarjeta } from "../../comun/piezas_panel.jsx";
import { COLOR_ESTADO, NOMBRE_ENTREGA, NOMBRE_ESTADO, fechaHora, textoPaso } from "../estados.js";
import { useCambiarEstado, usePedidoPanel } from "../hooks.js";

const VOLVER = <Link to="/admin/pedidos" className={BOTON_SECUNDARIO}><ArrowLeft size={16} aria-hidden="true" /> Pedidos</Link>;

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
      <Encabezado titulo={`Pedido #${pedido.numero}`} descripcion={`${fechaHora(pedido.creado_en)} · ${NOMBRE_ENTREGA[pedido.entrega]}`}>{VOLVER}</Encabezado>
      <p><span className={`rounded-full px-3 py-1 text-sm font-bold ${COLOR_ESTADO[pedido.estado]}`}>{NOMBRE_ESTADO[pedido.estado]}</span></p>
      {desactualizado && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">{desactualizado}</p>
          <button type="button" onClick={() => { setDesactualizado(null); onActualizar(); }} className={BOTON_SECUNDARIO}><RotateCw size={16} aria-hidden="true" /> Actualizar</button>
        </div>
      )}
      {puedeGestionar && pedido.siguientes.length > 0 && !desactualizado && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {avanzar && <button type="button" disabled={cambiar.isPending} onClick={() => aplicar(avanzar)} className={BOTON_PRIMARIO}>{textoPaso(avanzar)}</button>}
          {otros.map((paso) => (
            <button key={paso.estado} type="button" disabled={cambiar.isPending} onClick={() => setConMotivo(paso)} className={paso.tipo === "cancelar" ? BOTON_PELIGRO : BOTON_SECUNDARIO}>{textoPaso(paso)}</button>
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
              <span className="text-slate-600"> · {fechaHora(h.creado_en)} · {h.persona ?? (h.de ? "Sistema" : "Desde la web")}</span>
              {h.motivo && <span className="block text-slate-700">Motivo: {h.motivo}</span>}
            </li>
          ))}
        </ol>
      </Tarjeta>
      {conMotivo && <MotivoModal paso={conMotivo} numero={pedido.numero} enviando={cambiar.isPending} onConfirmar={(motivo) => aplicar(conMotivo, motivo)} onClose={() => setConMotivo(null)} />}
    </>
  );
}

function Dato({ nombre, children }) {
  return <div><dt className="text-slate-500">{nombre}</dt><dd className="font-medium text-slate-900">{children}</dd></div>;
}

/** MPE-07: volver, cancelar y reabrir piden motivo; queda en el historial. */
function MotivoModal({ paso, numero, enviando, onConfirmar, onClose }) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm({ defaultValues: { motivo: "" } });
  async function enviar({ motivo }) {
    if (!motivo.trim()) return setError("motivo", { message: "Escribí el motivo." });
    try { await onConfirmar(motivo.trim()); }
    catch (error) { setError("root", { message: mensajeError(error, "No se pudo cambiar el estado.") }); }
  }
  return (
    <Modal open onClose={onClose} busy={enviando} title={`${textoPaso(paso)} · pedido #${numero}`}>
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
        <TextareaField label="Motivo" name="motivo" register={register} error={errors.motivo?.message} rows={3} helperText="Queda en el historial del pedido." />
        <FormError message={errors.root?.message} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={BOTON_SECUNDARIO}>Volver</button>
          <button type="submit" disabled={enviando} className={paso.tipo === "cancelar" ? BOTON_PELIGRO : BOTON_PRIMARIO}>{enviando ? "Guardando…" : textoPaso(paso)}</button>
        </div>
      </form>
    </Modal>
  );
}
