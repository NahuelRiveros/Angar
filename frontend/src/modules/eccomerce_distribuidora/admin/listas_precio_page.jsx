import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, ListOrdered, Plus, Tags, Trash2 } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import AyudaTooltip from "../../../controls/ui/ayuda_tooltip.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { getListasPrecio, eliminarListaPrecio } from "../api/listas_precio_api.js";
import { RUTA_LISTAS } from "../utils/rutas_articulo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";
const ICONO = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100";
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const AYUDA = "La lista General es el precio de cada artículo y la ve cualquiera sin cuenta. Una lista regional se aplica a los clientes de sus localidades y solo guarda los artículos que cambian de precio: el resto se cobra con la General.";

/** Listas de precios regionales: cuántas localidades y artículos con precio especial tiene cada una. */
export default function ListasPrecioPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [eliminar, setEliminar] = useState(null);
  const listas = useQuery({ queryKey: ["listas-precio"], queryFn: getListasPrecio });
  const borrar = useMutation({
    mutationFn: (lista) => eliminarListaPrecio(lista.id),
    onSuccess: async (r) => { toast.success(r?.mensaje || "Lista eliminada"); setEliminar(null); await queryClient.invalidateQueries({ queryKey: ["listas-precio"] }); },
    onError: (e) => { toast.error(e.response?.data?.mensaje || "No se pudo eliminar la lista."); setEliminar(null); },
  });
  const filas = listas.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Listas de precios</h1>
            <AyudaTooltip etiqueta="Cómo funcionan las listas" texto={AYUDA} />
          </div>
          <p className="text-sm text-(--kt-ink-soft)">Precios distintos por localidad, solo en los artículos que cambian.</p>
        </div>
        <Link to={`${RUTA_LISTAS}/nueva`} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}><Plus size={16} /> Nueva lista</Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <p className="font-semibold text-(--kt-ink)">General</p>
        <p className="text-slate-600">El precio cargado en cada artículo. Se usa sin cuenta, sin localidad cargada o donde ninguna lista aplica.</p>
      </div>

      {listas.isPending ? <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>
        : listas.isError ? (
          <div className="space-y-2">
            <ErrorBanner message="No pudimos cargar las listas." />
            <button type="button" onClick={() => listas.refetch()} className={`${BOTON} border border-slate-300 bg-white`}>Reintentar</button>
          </div>
        ) : filas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <AdminEmptyState icon={Tags} title="Todavía no hay listas regionales." description="Mientras tanto, todos los clientes pagan la General."
              action={<Link to={`${RUTA_LISTAS}/nueva`} className={`${BOTON} bg-(--kt-petrol) text-white`}><Plus size={16} /> Nueva lista</Link>} />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {filas.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words text-(--kt-ink)">{l.nombre}
                    {!l.activo && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">Pausada</span>}
                  </p>
                  <p className="text-xs text-slate-500">{plural(l.localidades, "localidad", "localidades")} · {plural(l.articulos, "artículo con precio especial", "artículos con precio especial")}</p>
                </div>
                <Link to={`${RUTA_LISTAS}/${l.id}/precios`} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}><ListOrdered size={16} /> Precios</Link>
                <Link to={`${RUTA_LISTAS}/${l.id}`} className={ICONO} aria-label={`Editar ${l.nombre}`} title="Nombre y localidades"><Edit2 size={18} /></Link>
                <button type="button" onClick={() => setEliminar(l)} className={ICONO} aria-label={`Eliminar ${l.nombre}`} title="Eliminar"><Trash2 size={18} /></button>
              </li>
            ))}
          </ul>
        )}

      <ConfirmDialog
        open={Boolean(eliminar)} loading={borrar.isPending} onClose={() => setEliminar(null)} confirmLabel="Eliminar" title="Eliminar lista"
        message={eliminar ? `¿Eliminar "${eliminar.nombre}"? Sus ${eliminar.localidades} localidad(es) pasan a pagar la General. Los pedidos ya hechos no cambian.` : ""}
        onConfirm={() => borrar.mutate(eliminar)}
      />
    </div>
  );
}
