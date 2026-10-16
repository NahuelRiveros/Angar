import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronRight, X } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import AyudaTooltip from "../../../controls/ui/ayuda_tooltip.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { safeReturnTo } from "../../../controls/acceso/return_to.js";
import { getCategorias } from "../api/categoria_distribuidora_api.js";
import { getMarca, crearMarca, actualizarMarca } from "../api/marcas_distribuidora_api.js";
import { indexarCategorias } from "../utils/categoria_jerarquia.js";
import { RUTA_MARCAS, rutaFichaMarca } from "../utils/rutas_articulo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";
const sinAcentos = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Alta y edición de una marca en página propia: nombre y dónde se ofrece
 * (familias enteras o categorías puntuales). Al guardar o cancelar vuelve a
 * `?volver=` (por defecto, Marcas). Pregunta antes de salir con cambios.
 */
export default function MarcaFormPage() {
  const { id } = useParams();
  const editando = id !== undefined;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const volver = safeReturnTo(params.get("volver"), RUTA_MARCAS);

  const marca = useQuery({ queryKey: ["gestion-marca", Number(id)], queryFn: () => getMarca(id), enabled: editando, retry: false });
  const categorias = useQuery({ queryKey: ["gestion-categorias"], queryFn: getCategorias, staleTime: 60_000 });
  const listo = categorias.isSuccess && (!editando || marca.isSuccess);

  let contenido;
  if (!listo && !categorias.isError && !marca.isError) contenido = <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>;
  else if (categorias.isError || marca.isError) {
    const noExiste = marca.error?.response?.status === 404;
    contenido = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <span className="flex items-center gap-2"><AlertTriangle aria-hidden="true" size={18} />{noExiste ? "Esta marca no existe o fue unificada con otra." : "No pudimos cargar los datos."}</span>
        {!noExiste && <button type="button" onClick={() => { categorias.refetch(); marca.refetch(); }} className={`${BOTON} bg-white shadow-sm`}>Reintentar</button>}
      </div>
    );
  } else {
    contenido = (
      <FormularioMarca key={marca.data?.id ?? "nueva"} marca={marca.data} categorias={categorias.data} volver={volver}
        onGuardado={async (r) => {
          toast.success(r?.mensaje || "Marca guardada");
          await Promise.all(["gestion-marcas-resumen", "gestion-marcas", "marcas-familia", "gestion-marca"].map((clave) => queryClient.invalidateQueries({ queryKey: [clave] })));
          navigate(volver);
        }}
        onCancelar={() => navigate(volver)} editando={editando} />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-6">
      <div>
        <Link to={volver} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-(--kt-teal-700)"><ArrowLeft size={16} /> Volver</Link>
        <h1 className="kt-display text-2xl font-bold break-words text-(--kt-ink)">{editando ? (marca.data ? `Marca ${marca.data.nombre}` : "Marca") : "Nueva marca"}</h1>
      </div>
      {contenido}
    </div>
  );
}

function FormularioMarca({ marca, categorias, editando, volver, onGuardado, onCancelar }) {
  const navigate = useNavigate();
  const indice = useMemo(() => indexarCategorias(categorias), [categorias]);
  const [nombre, setNombre] = useState(marca?.nombre ?? "");
  const [elegidas, setElegidas] = useState(() => new Set(marca?.categorias ?? []));
  const [abiertas, setAbiertas] = useState(() => new Set((marca?.categorias ?? []).map((c) => indice.familiaDe.get(c)).filter(Boolean)));
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState(null); // { mensaje, existente? }
  const guardado = useRef(false);
  const enUso = marca?.articulos_por_categoria ?? {};

  const inicial = useMemo(() => JSON.stringify([marca?.nombre ?? "", [...(marca?.categorias ?? [])].sort()]), [marca]);
  const sucio = JSON.stringify([nombre, [...elegidas].sort()]) !== inicial;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => sucio && !guardado.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!sucio) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  const guardar = useMutation({
    mutationFn: (payload) => (editando ? actualizarMarca(marca.id, payload) : crearMarca(payload)),
    onSuccess: (r) => { guardado.current = true; onGuardado(r); },
    onError: (e) => setError({
      mensaje: e.response?.data?.mensaje || "No se pudo guardar la marca.",
      existente: e.response?.data?.codigo === "MARCA_EXISTE" ? e.response.data.data : null,
    }),
  });

  const palabras = sinAcentos(filtro).split(/\s+/).filter(Boolean);
  const coincide = (texto) => palabras.every((p) => sinAcentos(texto).includes(p));
  const familiasVisibles = indice.familias.filter((f) => !palabras.length || coincide(indice.rutaDe.get(f.id))
    || indice.categoriasDe.get(f.id).some((c) => coincide(indice.rutaDe.get(c.id))));

  function alternar(idCategoria) {
    setElegidas((prev) => { const s = new Set(prev); if (s.has(idCategoria)) s.delete(idCategoria); else s.add(idCategoria); return s; });
  }
  function alternarAbierta(idFamilia) {
    setAbiertas((prev) => { const s = new Set(prev); if (s.has(idFamilia)) s.delete(idFamilia); else s.add(idFamilia); return s; });
  }
  function submit(e) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError({ mensaje: "Escribí el nombre de la marca." });
    if (!elegidas.size) return setError({ mensaje: "Elegí al menos una familia o categoría donde se ofrece." });
    guardar.mutate({ nombre: nombre.trim(), categorias: [...elegidas] });
  }
  const resumen = [...elegidas].map((c) => ({ id: c, ruta: indice.rutaDe.get(c) })).filter((c) => c.ruta).sort((a, b) => a.ruta.localeCompare(b.ruta, "es"));

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <label className="block text-sm font-medium text-gray-700">Nombre de la marca <span className="text-red-500">*</span>
          <input value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Arcor"
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25" />
        </label>
        <p className="text-xs text-slate-500">Se guarda con formato (ej. "la serenísima" → "La Serenísima"). No puede repetirse aunque cambien mayúsculas o acentos.</p>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-1">
          <legend className="font-semibold text-(--kt-ink)">¿Dónde se ofrece? <span className="text-red-500">*</span></legend>
          <AyudaTooltip etiqueta="Familia entera o categorías" texto="Tildá la familia entera si la marca vende en todas sus categorías, o abrila y elegí categorías puntuales. Al cargar un artículo, la marca aparece en la lista de esas categorías." />
        </div>
        {resumen.length > 0 && (
          <ul aria-label="Elegidas" className="flex flex-wrap gap-1">
            {resumen.map((c) => (
              <li key={c.id} className="inline-flex items-center gap-1 rounded-full bg-(--kt-turquoise-soft) py-0.5 pr-1 pl-3 text-sm">
                {c.ruta}{indice.familiaDe.get(c.id) === c.id ? " (toda)" : ""}
                <button type="button" onClick={() => alternar(c.id)} aria-label={`Quitar ${c.ruta}`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        {indice.familias.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Primero creá las familias y categorías. <Link to="/distribuidora/admin/categorias" className="font-semibold underline">Ir a Familias y categorías</Link>
          </p>
        ) : (
          <>
            <label className="block">
              <span className="sr-only">Filtrar familias y categorías</span>
              <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar, ej: galletitas"
                className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25" />
            </label>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {familiasVisibles.map((f) => {
                const toda = elegidas.has(f.id);
                const abierta = abiertas.has(f.id) || palabras.length > 0;
                const hijas = indice.categoriasDe.get(f.id).filter((c) => !palabras.length || coincide(indice.rutaDe.get(c.id)) || coincide(f.nombre));
                const enFamilia = indice.categoriasDe.get(f.id).filter((c) => elegidas.has(c.id)).length;
                return (
                  <li key={f.id}>
                    <div className="flex items-center gap-1 px-1">
                      <button type="button" onClick={() => alternarAbierta(f.id)} aria-expanded={abierta} aria-label={`${abierta ? "Cerrar" : "Abrir"} ${f.nombre}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                        {abierta ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                      <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                        <input type="checkbox" checked={toda} onChange={() => alternar(f.id)} className="h-5 w-5" />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold break-words">{f.nombre}</span>
                          <span className="ml-2 text-xs text-slate-500">{toda ? "toda la familia" : enFamilia ? `${enFamilia} categoría(s)` : ""}</span>
                        </span>
                        {enUso[f.id] > 0 && <span className="shrink-0 text-xs text-slate-500">{enUso[f.id]} art.</span>}
                      </label>
                    </div>
                    {abierta && hijas.length > 0 && (
                      <ul className="pb-2 pl-14">
                        {hijas.map((c) => (
                          <li key={c.id}>
                            <label className={`flex min-h-11 items-center gap-3 pr-3 ${toda ? "text-slate-400" : "cursor-pointer"}`}>
                              <input type="checkbox" checked={toda || elegidas.has(c.id)} disabled={toda} onChange={() => alternar(c.id)} className="h-5 w-5" />
                              <span className="min-w-0 flex-1 break-words">{indice.rutaDe.get(c.id).split(" › ").slice(1).join(" › ")}</span>
                              {enUso[c.id] > 0 && <span className="shrink-0 text-xs text-slate-500">{enUso[c.id]} art.</span>}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
              {familiasVisibles.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Nada coincide con “{filtro}”.</li>}
            </ul>
          </>
        )}
      </fieldset>

      {error && (
        <div className="space-y-2">
          <ErrorBanner message={error.mensaje} />
          {error.existente && (
            <button type="button" onClick={() => navigate(rutaFichaMarca({ id: error.existente.id, volver }))} className="text-sm font-semibold text-(--kt-teal-700) underline">
              Editar "{error.existente.nombre}"
            </button>
          )}
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button type="button" onClick={onCancelar} disabled={guardar.isPending} className={`${BOTON} border border-slate-300 text-slate-700 hover:bg-slate-50`}>Cancelar</button>
        <button type="submit" disabled={guardar.isPending} className={`${BOTON} bg-(--kt-petrol) px-5 text-white hover:bg-(--kt-night)`}>{guardar.isPending ? "Guardando…" : "Guardar marca"}</button>
      </div>
      <ConfirmDialog
        open={blocker.state === "blocked"} variant="warning" title="Tenés cambios sin guardar"
        message="Si salís ahora se pierden. ¿Salir igual?" confirmLabel="Salir sin guardar" cancelLabel="Seguir editando"
        onConfirm={() => blocker.proceed?.()} onClose={() => blocker.reset?.()}
      />
    </form>
  );
}
