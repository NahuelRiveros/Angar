import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, Truck } from "lucide-react";
import SelectField from "../../../controls/ui/select_field.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import { ESTADOS } from "../../../config/order_config.js";
import { money } from "../../../controls/pedidos/order_format.js";
import { getListaCarga, getTodasLasNotasPedido } from "../api/nota_pedido_api.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50";
const fecha = (valor) => new Date(valor).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const persona = (nota) => [nota.usuario?.persona?.nombre, nota.usuario?.persona?.apellido].filter(Boolean).join(" ") || "Cliente";

function ElegirPedidos({ onArmar }) {
  const [estado, setEstado] = useState("en_curso");
  const [pagina, setPagina] = useState(1);
  const [elegidos, setElegidos] = useState(() => new Set());
  const pedidos = useQuery({
    queryKey: ["lista-carga-pedidos", estado, pagina],
    queryFn: () => getTodasLasNotasPedido({ estado: estado || undefined, pagina, por_pagina: 50 }),
    placeholderData: keepPreviousData,
  });
  const filas = (pedidos.data?.data ?? []).filter((n) => n.estado !== "cancelada");
  const todosElegidos = filas.length > 0 && filas.every((n) => elegidos.has(n.id));
  const alternar = (id) => setElegidos((antes) => { const s = new Set(antes); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const alternarTodos = () => setElegidos((antes) => { const s = new Set(antes); filas.forEach((n) => (todosElegidos ? s.delete(n.id) : s.add(n.id))); return s; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="min-w-48"><SelectField label="Pedidos" placeholder="Todos (sin cancelados)" options={Object.entries(ESTADOS).filter(([v]) => v !== "cancelada").map(([value, s]) => ({ value, label: s.label }))}
          value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }} /></div>
        <button type="button" disabled={!elegidos.size} onClick={() => onArmar([...elegidos])} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>
          <Truck size={16} /> Armar lista de carga{elegidos.size ? ` (${elegidos.size} pedido${elegidos.size === 1 ? "" : "s"})` : ""}
        </button>
      </div>

      {pedidos.isPending ? <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>
        : pedidos.isError ? <div className="space-y-2"><ErrorBanner message="No pudimos cargar los pedidos." /><button type="button" onClick={() => pedidos.refetch()} className={`${BOTON} border border-slate-300 bg-white`}>Reintentar</button></div>
        : filas.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white"><AdminEmptyState icon={Truck} title="No hay pedidos en este estado." /></div>
        : (
          <div className="rounded-2xl border border-slate-200 bg-white">
            <label className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5" checked={todosElegidos} onChange={alternarTodos} /> Elegir todos los de esta página
            </label>
            <ul className="divide-y divide-slate-100">
              {filas.map((n) => (
                <li key={n.id}>
                  <label className="flex min-h-14 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" className="h-5 w-5" checked={elegidos.has(n.id)} onChange={() => alternar(n.id)} aria-label={`Pedido #${n.id} de ${persona(n)}`} />
                    <span className="min-w-0 flex-1"><b>Pedido #{n.id}</b> · {persona(n)}<span className="block text-xs text-slate-500">{fecha(n.fecha_alta)} · {n.localidad}</span></span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[n.estado]?.className ?? ""}`}>{ESTADOS[n.estado]?.label ?? n.estado}</span>
                    <span className="font-semibold">{money(n.total)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      <Pagination page={pagina} pages={pedidos.data?.totalPages} total={pedidos.data?.total} disabled={pedidos.isFetching} onChange={setPagina} />
    </div>
  );
}

function Lista({ ids, onVolver }) {
  const lista = useQuery({ queryKey: ["lista-carga", ids], queryFn: () => getListaCarga(ids) });
  if (lista.isPending) return <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>;
  if (lista.isError) {
    return <div className="space-y-2"><ErrorBanner message={lista.error.response?.data?.mensaje || "No pudimos armar la lista de carga."} />
      <button type="button" onClick={() => lista.refetch()} className={`${BOTON} border border-slate-300 bg-white`}>Reintentar</button></div>;
  }
  const { comprobantes, familias, totales } = lista.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" onClick={onVolver} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}><ArrowLeft size={16} /> Elegir otros pedidos</button>
        <button type="button" onClick={() => window.print()} disabled={!comprobantes.length} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}><Printer size={16} /> Imprimir</button>
      </div>
      <article aria-label="Artículos a cargar" className="rounded-2xl border border-slate-200 bg-white p-4 print:rounded-none print:border-0 print:p-0">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold">Artículos a cargar</h2>
            <p className="text-sm text-slate-600">Compuesto por {comprobantes.length} comprobante(s): {comprobantes.map((id) => `#${id}`).join(", ") || "ninguno"}</p>
          </div>
          <p className="text-sm text-slate-600">{new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</p>
        </header>
        {!familias.length ? <AdminEmptyState icon={Truck} title="Los pedidos elegidos no tienen artículos para cargar." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-slate-600 uppercase">
                <tr><th className="py-2 pr-3">Código</th><th className="py-2 pr-3">Artículo</th><th className="py-2 pr-3 text-right">Cantidad</th><th className="py-2 pr-3 text-right">Bultos</th><th className="py-2 text-right">Sueltos</th></tr>
              </thead>
              {familias.map((familia) => (
                <tbody key={familia.id ?? "sin"} className="break-inside-avoid">
                  <tr><th colSpan={5} scope="colgroup" className="border-t border-slate-300 bg-slate-50 px-2 py-1.5 text-left text-xs font-bold uppercase print:bg-transparent">Familia: {familia.nombre}</th></tr>
                  {familia.articulos.map((a) => (
                    <tr key={`${a.producto_id}-${a.variedad_id}`} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3 font-mono text-xs">{a.codigo ?? "—"}</td>
                      <td className="py-1.5 pr-3">{a.descripcion}{a.unidades_por_bulto > 1 && <span className="block text-xs text-slate-500">{a.unidad_bulto.toLowerCase()} x {a.unidades_por_bulto}</span>}</td>
                      <td className="py-1.5 pr-3 text-right font-semibold">{a.cantidad}</td>
                      <td className="py-1.5 pr-3 text-right">{a.bultos}</td>
                      <td className="py-1.5 text-right">{a.sueltos}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
            <p className="mt-3 border-t border-slate-300 pt-2 text-sm font-semibold">Fin de artículos a cargar · {totales.articulos} artículo(s) · {totales.unidades} unidades · {totales.bultos} bultos</p>
          </div>
        )}
      </article>
    </div>
  );
}

/**
 * "Artículos a cargar", como la planilla del sistema del cliente: se eligen pedidos y se
 * imprime lo que hay que cargar, por familia, en bultos y sueltos. Los pedidos elegidos
 * quedan en la dirección (?pedidos=12,15) para poder volver a imprimir la misma lista.
 */
export default function ListaCargaPage() {
  const [params, setParams] = useSearchParams();
  const ids = (params.get("pedidos") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-6 print:max-w-none print:p-0">
      <div className="print:hidden">
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Lista de carga</h1>
        <p className="text-sm text-(--kt-ink-soft)">Elegí los pedidos a preparar y armá la lista de artículos a cargar, por familia, en bultos y sueltos.</p>
      </div>
      {ids.length
        ? <Lista ids={ids} onVolver={() => setParams({})} />
        : <ElegirPedidos onArmar={(elegidos) => setParams({ pedidos: elegidos.sort((a, b) => a - b).join(",") })} />}
    </div>
  );
}
