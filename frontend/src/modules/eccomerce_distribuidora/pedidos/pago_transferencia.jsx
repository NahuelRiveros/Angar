import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, FileText, Upload } from "lucide-react";
import { clientConfig } from "../../../../../client_config.js";
import { orderConfig, receiptProblem, ESTADOS_COMPROBANTE, TIPOS_COMPROBANTE } from "../../../config/order_config.js";
import { money } from "../../../controls/pedidos/order_format.js";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { getEnlaceComprobante, subirComprobante } from "../api/nota_pedido_api.js";

const fecha = (valor) => new Date(valor).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

function Dato({ etiqueta, valor, copiable = false }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* Sin permiso de portapapeles: el dato sigue a la vista para copiarlo a mano. */ }
  }
  return <div className="flex flex-wrap items-center justify-between gap-x-3 py-1">
    <dt className="text-slate-500">{etiqueta}</dt>
    <dd className="flex min-w-0 items-center gap-1 font-semibold">
      <span className="break-all">{valor}</span>
      {copiable && <button type="button" onClick={copiar} aria-label={copiado ? `${etiqueta} copiado` : `Copiar ${etiqueta}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
        {copiado ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
      </button>}
    </dd>
  </div>;
}

export function DatosTransferencia({ importe }) {
  const datos = clientConfig.transferencia;
  return <dl className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3 text-sm">
    <Dato etiqueta="Importe" valor={money(importe)} />
    <Dato etiqueta="Titular" valor={datos.titular} />
    <Dato etiqueta="Banco" valor={datos.banco} />
    <Dato etiqueta="CBU" valor={datos.cbu} copiable />
    <Dato etiqueta="Alias" valor={datos.alias} copiable />
    <Dato etiqueta="CUIT" valor={datos.cuit} />
  </dl>;
}

/** Abre el comprobante en otra pestaña con el enlace temporal que firma el servidor. */
export function VerComprobante({ notaId, comprobante }) {
  const enlace = useMutation({ mutationFn: () => getEnlaceComprobante(notaId, comprobante.id) });
  async function abrir() {
    // La pestaña se abre en el clic: abrirla después de esperar la respuesta la bloquea el navegador.
    const pestana = window.open("", "_blank");
    if (pestana) pestana.opener = null;
    try {
      const url = await enlace.mutateAsync();
      if (pestana) pestana.location.href = url; else window.location.assign(url);
    } catch { pestana?.close(); }
  }
  return <span className="inline-flex flex-col items-end">
    <button type="button" onClick={abrir} disabled={enlace.isPending} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
      {enlace.isPending ? "Abriendo…" : "Ver"}
    </button>
    {enlace.isError && <span role="alert" className="text-xs text-red-700">No se pudo abrir. Reintentá.</span>}
  </span>;
}

export function ListaComprobantes({ notaId, comprobantes, acciones }) {
  return <ul className="space-y-2">{comprobantes.map((c) => {
    const estado = ESTADOS_COMPROBANTE[c.estado] ?? ESTADOS_COMPROBANTE.pendiente;
    return <li key={c.id} className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-all font-semibold">{c.nombre_archivo || `Comprobante #${c.id}`}</p>
            <p className="text-xs text-slate-500">Enviado el {fecha(c.subido_en)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estado.className}`}>{estado.label}</span>
          <VerComprobante notaId={notaId} comprobante={c} />
        </div>
      </div>
      {c.estado === "rechazado" && c.motivo_rechazo && <p className="wrap-break-word text-rose-800">Motivo: {c.motivo_rechazo}</p>}
      {acciones?.(c)}
    </li>;
  })}</ul>;
}

function SubirComprobante({ notaId, onSubido }) {
  const id = useId();
  const [errorLocal, setErrorLocal] = useState("");
  const [aviso, setAviso] = useState("");
  const subir = useMutation({
    mutationFn: (archivo) => subirComprobante(notaId, archivo),
    onSuccess: (respuesta) => { setAviso(respuesta.mensaje); onSubido?.(respuesta.data); },
  });
  function elegir(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = ""; // permite volver a elegir el mismo archivo después de un error
    if (!archivo || subir.isPending) return;
    setAviso(""); setErrorLocal(""); subir.reset();
    if (!TIPOS_COMPROBANTE[archivo.type]) return setErrorLocal("Elegí una foto (JPG, PNG o WEBP) o un PDF.");
    if (archivo.size > orderConfig.receipts.maxBytes) return setErrorLocal("El archivo supera los 5 MB. Probá con una captura de pantalla.");
    subir.mutate(archivo);
  }
  return <div className="space-y-2">
    <label htmlFor={id} aria-disabled={subir.isPending}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-(--kt-teal-700) px-4 text-sm font-bold text-white hover:bg-(--kt-petrol) focus-within:outline-2 focus-within:outline-offset-2 ${subir.isPending ? "pointer-events-none opacity-60" : ""}`}>
      <Upload size={18} aria-hidden="true" />{subir.isPending ? "Subiendo comprobante…" : "Adjuntar comprobante"}
      <input id={id} type="file" className="sr-only" accept={Object.keys(TIPOS_COMPROBANTE).join(",")} onChange={elegir} disabled={subir.isPending} />
    </label>
    <p className="text-xs text-slate-500">Foto o PDF de hasta 5 MB.</p>
    <ErrorBanner message={errorLocal || (subir.isError ? mensajeDe(subir.error, "No se pudo subir el comprobante. Reintentá.") : "")} />
    {aviso && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{aviso}</p>}
  </div>;
}

/**
 * Pago del comprador: datos para transferir, comprobantes enviados y subida.
 * `datosAbiertos` muestra los datos desplegados (pantalla de pedido recién enviado).
 */
export default function PagoTransferencia({ nota, comprobantes = [], onSubido, datosAbiertos = false }) {
  if (nota.estado === "cancelada" && !comprobantes.length) return null;
  const saldo = Math.round((Number(nota.total) - Number(nota.monto_pagado || 0)) * 100) / 100;
  const pagado = nota.estado_pago === "pagado";
  const problema = receiptProblem(nota, comprobantes.length);
  return <section aria-label="Pago por transferencia" className="space-y-3 text-left">
    <h3 className="font-bold">Pago por transferencia</h3>
    {pagado
      ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Recibimos tu pago. ¡Gracias!</p>
      : nota.estado !== "cancelada" && <details open={datosAbiertos} className="group">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Ver datos para transferir</summary>
        <div className="space-y-2 pt-1">
          <p className="text-sm text-slate-600">Transferí el saldo y adjuntá el comprobante: lo revisamos y te avisamos por mail.</p>
          <DatosTransferencia importe={saldo} />
        </div>
      </details>}
    {comprobantes.length > 0 && <ListaComprobantes notaId={nota.id} comprobantes={comprobantes} />}
    {problema ? !pagado && nota.estado !== "cancelada" && <p className="text-xs text-slate-500">{problema}</p>
      : <SubirComprobante notaId={nota.id} onSubido={onSubido} />}
  </section>;
}
