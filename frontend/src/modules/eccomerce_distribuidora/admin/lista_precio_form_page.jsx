import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, X } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import AyudaTooltip from "../../../controls/ui/ayuda_tooltip.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { getProvincias, getDepartamentos, getLocalidades } from "../../../api/ubicacion_api.js";
import { getListaPrecio, crearListaPrecio, actualizarListaPrecio } from "../api/listas_precio_api.js";
import { RUTA_LISTAS } from "../utils/rutas_articulo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";
const clave = (l) => [l.provincia, l.departamento ?? "", l.localidad].join("|").toLowerCase();
const unicos = (lista) => [...new Map(lista.map((x) => [x.nombre, x])).values()];

/**
 * Alta y edición de una lista de precios: nombre, si está activa y en qué
 * localidades aplica. Las localidades se eligen del mismo catálogo que usa el
 * cliente al cargar su dirección (provincia → departamento → localidad).
 */
export default function ListaPrecioFormPage() {
  const { id } = useParams();
  const editando = id !== undefined;
  const lista = useQuery({ queryKey: ["lista-precio", Number(id)], queryFn: () => getListaPrecio(id), enabled: editando, retry: false });

  let contenido;
  if (editando && lista.isPending) contenido = <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>;
  else if (lista.isError) {
    contenido = (
      <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <AlertTriangle aria-hidden="true" size={18} />{lista.error?.response?.status === 404 ? "Esta lista no existe." : "No pudimos cargar la lista."}
      </div>
    );
  } else contenido = <FormularioLista key={lista.data?.id ?? "nueva"} lista={lista.data} />;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-6">
      <div>
        <Link to={RUTA_LISTAS} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-(--kt-teal-700)"><ArrowLeft size={16} /> Listas de precios</Link>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">{editando ? (lista.data ? `Lista ${lista.data.nombre}` : "Lista") : "Nueva lista"}</h1>
      </div>
      {contenido}
    </div>
  );
}

function FormularioLista({ lista }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(lista?.nombre ?? "");
  const [activo, setActivo] = useState(lista?.activo ?? true);
  const [elegidas, setElegidas] = useState(() => new Map((lista?.localidades ?? []).map((l) => [clave(l), l])));
  const [provincia, setProvincia] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [error, setError] = useState("");

  const provincias = useQuery({ queryKey: ["ubicacion", "provincias"], queryFn: getProvincias, staleTime: Infinity });
  const provinciaId = (provincias.data ?? []).find((p) => p.nombre === provincia)?.id;
  const departamentos = useQuery({ queryKey: ["ubicacion", "departamentos", provinciaId], queryFn: () => getDepartamentos(provinciaId), enabled: Boolean(provinciaId), staleTime: Infinity });
  const departamentoId = (departamentos.data ?? []).find((d) => d.nombre === departamento)?.id;
  const localidades = useQuery({ queryKey: ["ubicacion", "localidades", provinciaId, departamentoId], queryFn: () => getLocalidades(provinciaId, departamentoId), enabled: Boolean(departamentoId), staleTime: Infinity });
  const disponibles = useMemo(() => unicos(localidades.data ?? []).map((l) => ({ provincia, departamento, localidad: l.nombre })), [localidades.data, provincia, departamento]);
  const todasElegidas = disponibles.length > 0 && disponibles.every((l) => elegidas.has(clave(l)));

  function alternar(l) {
    setElegidas((prev) => { const m = new Map(prev); if (m.has(clave(l))) m.delete(clave(l)); else m.set(clave(l), l); return m; });
  }
  function alternarTodas() {
    setElegidas((prev) => { const m = new Map(prev); for (const l of disponibles) if (todasElegidas) m.delete(clave(l)); else m.set(clave(l), l); return m; });
  }

  const guardar = useMutation({
    mutationFn: (payload) => (lista ? actualizarListaPrecio(lista.id, payload) : crearListaPrecio(payload)),
    onSuccess: async (r) => {
      toast.success(r?.mensaje || "Lista guardada");
      await queryClient.invalidateQueries({ queryKey: ["listas-precio"] });
      await queryClient.invalidateQueries({ queryKey: ["lista-precio"] });
      // Recién creada: el paso siguiente es cargarle los precios.
      navigate(lista ? RUTA_LISTAS : `${RUTA_LISTAS}/${r.data.id}/precios`);
    },
    onError: (e) => setError(e.response?.data?.mensaje || "No se pudo guardar la lista."),
  });
  function submit(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribí el nombre de la lista.");
    if (!elegidas.size) return setError("Elegí al menos una localidad donde aplica.");
    guardar.mutate({ nombre: nombre.trim(), activo, localidades: [...elegidas.values()] });
  }
  const resumen = [...elegidas.values()].sort((a, b) => `${a.provincia}${a.localidad}`.localeCompare(`${b.provincia}${b.localidad}`, "es"));

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <label className="block text-sm font-medium text-gray-700">Nombre de la lista <span className="text-red-500">*</span>
          <input value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Interior Norte"
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25" />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5" />
          Activa: sus clientes pagan estos precios (pausada, pagan la General)
        </label>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-1">
          <legend className="font-semibold text-(--kt-ink)">¿En qué localidades aplica? <span className="text-red-500">*</span></legend>
          <AyudaTooltip etiqueta="Localidades de la lista" texto="Se usa la localidad que el cliente carga en sus datos de entrega. Una localidad puede estar en una sola lista." />
        </div>
        {resumen.length > 0 && (
          <ul aria-label="Localidades elegidas" className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
            {resumen.map((l) => (
              <li key={clave(l)} className="inline-flex items-center gap-1 rounded-full bg-(--kt-turquoise-soft) py-0.5 pr-1 pl-3 text-sm">
                {l.localidad} <span className="text-xs text-slate-500">({l.departamento ? `${l.departamento}, ` : ""}{l.provincia})</span>
                <button type="button" onClick={() => alternar(l)} aria-label={`Quitar ${l.localidad}`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Provincia" placeholder="Elegí la provincia" value={provincia}
            options={(provincias.data ?? []).map((p) => ({ value: p.nombre, label: p.nombre }))}
            onChange={(e) => { setProvincia(e.target.value); setDepartamento(""); }} />
          <SelectField label="Departamento" placeholder={provincia ? "Elegí el departamento" : "Primero la provincia"} value={departamento} disabled={!provincia}
            options={unicos(departamentos.data ?? []).map((d) => ({ value: d.nombre, label: d.nombre }))}
            onChange={(e) => setDepartamento(e.target.value)} />
        </div>
        {provincias.isError && <ErrorBanner message="No pudimos cargar las provincias." />}
        {departamento && (localidades.isPending ? <AdminSpinner /> : (
          <div className="rounded-xl border border-slate-200">
            <label className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-3 text-sm font-semibold">
              <input type="checkbox" checked={todasElegidas} onChange={alternarTodas} className="h-5 w-5" /> Todas las de {departamento}
            </label>
            <ul className="grid max-h-72 gap-x-4 overflow-y-auto px-3 py-1 sm:grid-cols-2">
              {disponibles.map((l) => (
                <li key={clave(l)}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" checked={elegidas.has(clave(l))} onChange={() => alternar(l)} className="h-5 w-5" />
                    <span className="break-words">{l.localidad}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </fieldset>

      <ErrorBanner message={error} />
      <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <Link to={RUTA_LISTAS} className={`${BOTON} border border-slate-300 text-slate-700 hover:bg-slate-50`}>Cancelar</Link>
        <button type="submit" disabled={guardar.isPending} className={`${BOTON} bg-(--kt-petrol) px-5 text-white hover:bg-(--kt-night)`}>
          {guardar.isPending ? "Guardando…" : lista ? "Guardar lista" : "Crear y cargar precios"}
        </button>
      </div>
    </form>
  );
}
