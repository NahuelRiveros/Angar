import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, CircleX, Copy, MessageCircle, PartyPopper } from "lucide-react";
import { brandConfig } from "../../../../proyecto/config/brand_config.js";
import { clientConfig } from "../../../../../../proyecto/client_config.js";
import { formatearPrecio } from "../../comun/dinero.js";
import { BOTON_SECUNDARIO, BOTON_WHATSAPP } from "../../comun/estilos.js";
import { Cargando, ErrorReintentar } from "../../comun/piezas_web.jsx";
import { linkWhatsapp } from "../../comun/whatsapp.js";
import { NOMBRE_ENTREGA, NOMBRE_ESTADO, PASOS, fechaHora } from "../estados.js";
import { useSeguimiento } from "../hooks.js";

/** MPE-09: lo ve quien tiene el link. */
export default function SeguimientoPage() {
  const { clave } = useParams();
  const [params] = useSearchParams();
  const consulta = useSeguimiento(clave);
  const noExiste = [400, 404].includes(consulta.error?.response?.status);
  return (
    <div className="kt-body min-h-screen bg-white text-(--kt-ink)">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {consulta.isPending ? <Cargando texto="Cargando tu pedido" />
          : noExiste ? (
            <div className="py-14 text-center">
              <h1 className="kt-display text-3xl font-bold">No encontramos ese pedido</h1>
              <p className="mt-2 text-(--kt-ink-soft)">Revisá que el link esté completo.</p>
              <Link to="/catalogo" className={`${BOTON_SECUNDARIO} mt-6`}>Ver el catálogo</Link>
            </div>
          )
            : consulta.isError ? <ErrorReintentar consulta={consulta} mensaje="No pudimos cargar tu pedido." />
              : <Pedido pedido={consulta.data} nuevo={params.has("nuevo")} />}
      </div>
    </div>
  );
}

function Pedido({ pedido, nuevo }) {
  const link = window.location.origin + window.location.pathname;
  return (
    <div className="space-y-6">
      {nuevo && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <p className="flex items-center gap-2 text-lg font-bold"><PartyPopper size={22} aria-hidden="true" /> ¡Recibimos tu pedido, {pedido.nombre}!</p>
          <p className="mt-1">Te vamos a escribir para confirmarlo. Guardá este link para ver cómo avanza.</p>
        </div>
      )}
      <header>
        <p className="text-(--kt-ink-soft)">{fechaHora(pedido.creado_en)} · {NOMBRE_ENTREGA[pedido.entrega]}</p>
        <h1 className="kt-display text-3xl font-bold sm:text-4xl">Pedido #{pedido.numero}</h1>
      </header>
      {pedido.estado === "cancelado"
        ? <p className="flex items-center gap-2 rounded-2xl bg-slate-100 p-4 font-semibold"><CircleX size={20} aria-hidden="true" /> Este pedido fue cancelado. Si tenés dudas, escribinos.</p>
        : <Pasos pedido={pedido} />}
      <section aria-label="Lo que pediste">
        <ul className="divide-y divide-(--kt-border) border-y border-(--kt-border)">
          {pedido.items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 py-3">
              <span><span className="font-semibold">{item.cantidad} × {item.producto_nombre}</span>{item.variante_nombre && <span className="text-(--kt-ink-soft)"> ({item.variante_nombre})</span>}</span>
              <span className="shrink-0 tabular-nums">{formatearPrecio(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-baseline justify-between text-lg"><span className="font-semibold">Total</span><span className="text-2xl font-extrabold tabular-nums">{formatearPrecio(pedido.total)}</span></p>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row">
        {clientConfig.whatsapp && (
          <a href={linkWhatsapp(clientConfig.whatsapp, `¡Hola ${brandConfig.nombre}! Hice el pedido #${pedido.numero}. Lo pueden ver acá: ${link}`)} target="_blank" rel="noopener noreferrer" className={BOTON_WHATSAPP}>
            <MessageCircle size={20} aria-hidden="true" /> Avisar por WhatsApp
          </a>
        )}
        <CopiarLink link={link} />
      </div>
    </div>
  );
}

/** Recibido → Confirmado → Listo → Entregado, con la fecha de cada paso al que llegó. */
function Pasos({ pedido }) {
  const actual = PASOS.indexOf(pedido.estado);
  const fechas = Object.fromEntries(pedido.historial.map((h) => [h.estado, h.creado_en]));
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label={`Estado: ${NOMBRE_ESTADO[pedido.estado]}`}>
      {PASOS.map((paso, i) => {
        const hecho = i <= actual;
        return (
          <li key={paso} aria-current={i === actual ? "step" : undefined} className="text-center">
            <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 ${hecho ? "border-(--kt-teal-700) bg-(--kt-teal-700) text-white" : "border-slate-300 bg-white text-slate-400"}`}>
              {hecho ? <Check size={20} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`mt-1 block text-sm ${i === actual ? "font-bold" : hecho ? "" : "text-(--kt-ink-soft)"}`}>{NOMBRE_ESTADO[paso]}</span>
            {hecho && fechas[paso] && <span className="block text-xs text-(--kt-ink-soft)">{fechaHora(fechas[paso])}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function CopiarLink({ link }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); } catch { setCopiado(false); }
  }
  return (
    <button type="button" onClick={copiar} className={BOTON_SECUNDARIO}>
      {copiado ? <><Check size={18} aria-hidden="true" /> Link copiado</> : <><Copy size={18} aria-hidden="true" /> Copiar el link</>}
    </button>
  );
}
