import { useCallback, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardPaste, Save } from "lucide-react";
import SearchField from "../../../controls/ui/search_field.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import AyudaTooltip from "../../../controls/ui/ayuda_tooltip.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { getListaPrecio, getPreciosDeLista, guardarPreciosDeLista, importarPreciosDeLista } from "../api/listas_precio_api.js";
import { formatearPrecio } from "../utils/precio_iva.js";
import { RUTA_LISTAS } from "../utils/rutas_articulo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";
const CAMPO = "min-h-11 w-full rounded-xl border border-gray-300 px-2 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25";
const POR_PAGINA = 50;
// Acepta "1.234,56" (Excel en español) y "1234.56".
const leerPrecio = (texto) => {
  const t = String(texto ?? "").trim().replace(/^\$\s*/, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};
const textoPrecio = (n) => (n == null ? "" : String(n).replace(".", ","));
const descuento = (precio, anterior) => (precio != null && anterior > precio ? Math.round((1 - precio / anterior) * 100) : null);

/**
 * Precios de una lista: cada artículo con su precio General y el de la lista.
 * Se edita en la tabla (vacío = vuelve a la General) y se guarda todo junto; o
 * se pegan filas copiadas de Excel (código, precio, precio anterior).
 */
export default function ListaPrecioPreciosPage() {
  const { id } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filtros = { q: params.get("q") ?? "", solo: params.get("solo") === "1", pagina: Math.max(1, Number(params.get("pagina")) || 1) };
  const actualizar = useCallback((cambios) => setParams((anterior) => {
    const siguiente = new URLSearchParams(anterior);
    for (const [clave, valor] of Object.entries({ pagina: null, ...cambios })) valor ? siguiente.set(clave, String(valor)) : siguiente.delete(clave);
    return siguiente;
  }), [setParams]);
  const [cambios, setCambios] = useState(() => new Map()); // variedad_id → { precio, precio_anterior } en texto
  const [pegar, setPegar] = useState(false);
  const [error, setError] = useState("");

  const lista = useQuery({ queryKey: ["lista-precio", Number(id)], queryFn: () => getListaPrecio(id) });
  const precios = useQuery({
    queryKey: ["lista-precio-items", Number(id), filtros],
    queryFn: () => getPreciosDeLista(id, { q: filtros.q || undefined, solo_especiales: filtros.solo ? "1" : undefined, pagina: filtros.pagina, por_pagina: POR_PAGINA }),
    placeholderData: keepPreviousData,
  });
  const filas = precios.data?.data ?? [];

  const valor = (f, campo) => cambios.get(f.variedad_id)?.[campo] ?? textoPrecio(f[campo]);
  function editar(f, campo, texto) {
    setCambios((prev) => {
      const m = new Map(prev);
      const actual = m.get(f.variedad_id) ?? { precio: textoPrecio(f.precio), precio_anterior: textoPrecio(f.precio_anterior) };
      const siguiente = { ...actual, [campo]: texto };
      // Si vuelve a lo guardado, deja de contar como cambio.
      if (siguiente.precio === textoPrecio(f.precio) && siguiente.precio_anterior === textoPrecio(f.precio_anterior)) m.delete(f.variedad_id);
      else m.set(f.variedad_id, siguiente);
      return m;
    });
  }
  const invalidos = useMemo(() => [...cambios.values()].some((c) => Number.isNaN(leerPrecio(c.precio)) || Number.isNaN(leerPrecio(c.precio_anterior))), [cambios]);

  async function refrescar() {
    await Promise.all([["lista-precio-items"], ["listas-precio"], ["storefront"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }
  const guardar = useMutation({
    mutationFn: () => guardarPreciosDeLista(id, [...cambios.entries()].map(([variedad_id, c]) => ({ variedad_id, precio: leerPrecio(c.precio), precio_anterior: leerPrecio(c.precio_anterior) }))),
    onSuccess: async (r) => { toast.success(r?.mensaje || "Precios guardados"); setCambios(new Map()); await refrescar(); },
    onError: (e) => setError(e.response?.data?.mensaje || "No se pudieron guardar los precios."),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 pb-24 sm:p-6 sm:pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to={RUTA_LISTAS} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-(--kt-teal-700)"><ArrowLeft size={16} /> Listas de precios</Link>
          <div className="flex items-center gap-1">
            <h1 className="kt-display text-2xl font-bold break-words text-(--kt-ink)">Precios · {lista.data?.nombre ?? "Lista"}</h1>
            <AyudaTooltip etiqueta="Cómo cargar precios" texto="Escribí el precio solo en los artículos que cambian en esta lista; dejalo vacío para que se cobre la General. Precio anterior mayor al precio = oferta en esta región." />
          </div>
          {lista.data && <p className="text-sm text-(--kt-ink-soft)">{lista.data.localidades.length} localidad(es){lista.data.activo ? "" : " · Pausada: sus clientes pagan la General"} · <Link to={`${RUTA_LISTAS}/${id}`} className="underline">editar localidades</Link></p>}
        </div>
        <button type="button" onClick={() => setPegar(true)} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><ClipboardPaste size={16} /> Pegar desde Excel</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <SearchField value={filtros.q} onSearch={(q) => actualizar({ q })} label="Buscar artículo" placeholder="Código, descripción o marca" />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={filtros.solo} onChange={(e) => actualizar({ solo: e.target.checked ? "1" : null })} className="h-5 w-5" /> Solo con precio en esta lista
        </label>
      </div>

      {precios.isError && <ErrorBanner message="No pudimos cargar los precios." />}
      {precios.isPending ? <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>
        : filas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <AdminEmptyState title={filtros.solo ? "Esta lista todavía no tiene precios especiales." : "No hay artículos con esta búsqueda."} />
          </div>
        ) : (
          <section aria-label="Precios de la lista" aria-busy={precios.isFetching} className="space-y-2">
            <p className="text-sm text-slate-600">{precios.data.total} artículo(s)</p>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                  <tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">Artículo</th><th className="px-3 py-2 text-right">General</th><th className="w-36 px-3 py-2 text-right">Precio en lista</th><th className="w-36 px-3 py-2 text-right">Precio anterior</th><th className="px-3 py-2"><span className="sr-only">Oferta</span></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.map((f) => <Fila key={f.variedad_id} f={f} valor={valor} editar={editar} cambiado={cambios.has(f.variedad_id)} tabla />)}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 md:hidden">
              {filas.map((f) => <Fila key={f.variedad_id} f={f} valor={valor} editar={editar} cambiado={cambios.has(f.variedad_id)} />)}
            </ul>
            <Pagination page={filtros.pagina} pages={precios.data.total_paginas} total={precios.data.total} disabled={precios.isFetching || cambios.size > 0}
              onChange={(pagina) => { actualizar({ pagina }); window.scrollTo({ top: 0, behavior: "instant" }); }} />
            {cambios.size > 0 && <p className="text-center text-xs text-slate-500">Guardá los cambios antes de cambiar de página.</p>}
          </section>
        )}

      {cambios.size > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <span className="text-sm font-semibold">{cambios.size} cambio(s) sin guardar{invalidos ? " · revisá los precios marcados" : ""}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setCambios(new Map()); setError(""); }} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Descartar</button>
            <button type="button" disabled={invalidos || guardar.isPending} onClick={() => { setError(""); guardar.mutate(); }} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>
              <Save size={16} /> {guardar.isPending ? "Guardando…" : "Guardar precios"}
            </button>
          </div>
          {error && <div className="w-full"><ErrorBanner message={error} /></div>}
        </div>
      )}

      {pegar && <PegarExcelModal listaId={id} onClose={() => setPegar(false)} onImportado={async (r) => { toast.success(r?.mensaje || "Precios importados"); setPegar(false); await refrescar(); }} />}
    </div>
  );
}

function Fila({ f, valor, editar, cambiado, tabla = false }) {
  const precio = valor(f, "precio");
  const anterior = valor(f, "precio_anterior");
  const malPrecio = Number.isNaN(leerPrecio(precio));
  const malAnterior = Number.isNaN(leerPrecio(anterior));
  const off = descuento(leerPrecio(precio), leerPrecio(anterior));
  const nombre = `${f.nombre}${f.presentacion ? ` · ${f.presentacion}` : ""}`;
  const entrada = (campo, texto, mal, etiqueta) => (
    <input inputMode="decimal" value={texto} onChange={(e) => editar(f, campo, e.target.value)} aria-label={`${etiqueta} de ${nombre}`} aria-invalid={mal || undefined}
      placeholder={campo === "precio" ? "General" : "—"} className={`${CAMPO} ${mal ? "border-rose-400 bg-rose-50" : ""}`} />
  );
  const general = <>{formatearPrecio(f.precio_general)}{f.precio_anterior_general > f.precio_general && <span className="block text-xs text-slate-400 line-through">{formatearPrecio(f.precio_anterior_general)}</span>}</>;
  const oferta = off ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">-{off}%</span> : null;
  if (tabla) {
    return (
      <tr className={cambiado ? "bg-amber-50/60" : ""}>
        <td className="px-3 py-2 font-mono text-xs">{f.cod_ref ?? "—"}</td>
        <td className="px-3 py-2"><span className="font-semibold text-(--kt-ink)">{nombre}</span>{f.marca && <span className="block text-xs text-slate-500">{f.marca}</span>}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap">{general}</td>
        <td className="px-2 py-1">{entrada("precio", precio, malPrecio, "Precio en lista")}</td>
        <td className="px-2 py-1">{entrada("precio_anterior", anterior, malAnterior, "Precio anterior")}</td>
        <td className="px-3 py-2">{oferta}</td>
      </tr>
    );
  }
  return (
    <li className={`rounded-2xl border border-slate-200 p-3 ${cambiado ? "bg-amber-50/60" : "bg-white"}`}>
      <p className="font-mono text-xs text-slate-500">{f.cod_ref ?? "Sin código"}{f.marca ? ` · ${f.marca}` : ""}</p>
      <p className="font-semibold text-(--kt-ink)">{nombre}</p>
      <p className="text-xs text-slate-600">General: {formatearPrecio(f.precio_general)} {oferta}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <label>Precio en lista{entrada("precio", precio, malPrecio, "Precio en lista")}</label>
        <label>Precio anterior{entrada("precio_anterior", anterior, malAnterior, "Precio anterior")}</label>
      </div>
    </li>
  );
}

// Filas copiadas de Excel: separadas por tabulador o punto y coma. Encabezados se ignoran.
function leerFilas(texto) {
  return texto.split(/\r?\n/).map((l) => l.split(/\t|;/).map((c) => c.trim())).filter((c) => c[0])
    .map(([cod_ref, precio, precio_anterior]) => ({ cod_ref, precio: leerPrecio(precio), precio_anterior: leerPrecio(precio_anterior) }))
    .filter((f) => !Number.isNaN(f.precio) && f.precio != null);
}

function PegarExcelModal({ listaId, onClose, onImportado }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const filas = useMemo(() => leerFilas(texto), [texto]);
  const importar = useMutation({
    mutationFn: () => importarPreciosDeLista(listaId, filas),
    onSuccess: onImportado,
    onError: (e) => setError(e.response?.data?.mensaje || "No se pudieron importar los precios."),
  });
  return (
    <Modal title="Pegar precios desde Excel" onClose={onClose} busy={importar.isPending}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Copiá desde Excel tres columnas: <b>código</b>, <b>precio</b> y, si es oferta, <b>precio anterior</b>. Pegalas acá. Si algún código no existe, no se guarda nada y te avisamos cuáles son.</p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} aria-label="Filas copiadas de Excel" placeholder={"000519\t1350\n002982\t890,50\t990"}
          className="w-full rounded-xl border border-gray-300 p-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25" />
        <p className="text-sm text-slate-600">{filas.length} fila(s) con código y precio válidos.</p>
        <ErrorBanner message={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={importar.isPending} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Cancelar</button>
          <button type="button" disabled={!filas.length || importar.isPending} onClick={() => { setError(""); importar.mutate(); }} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>
            {importar.isPending ? "Importando…" : `Importar ${filas.length} precio(s)`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
