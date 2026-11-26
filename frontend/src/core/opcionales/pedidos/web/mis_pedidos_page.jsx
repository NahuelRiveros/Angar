import { Link } from "react-router-dom";
import { ChevronRight, ReceiptText } from "lucide-react";
import Pagination from "../../../controls/ui/pagination.jsx";
import { formatearPrecio } from "../../comun/dinero.js";
import { BOTON_PRIMARIO } from "../../comun/estilos.js";
import { Cargando, ErrorReintentar } from "../../comun/piezas_web.jsx";
import { useFiltrosUrl } from "../../comun/use_filtros_url.js";
import { COLOR_ESTADO, NOMBRE_ESTADO, fechaHora } from "../estados.js";
import { useMisPedidos } from "../hooks.js";

/** MPE-06: los pedidos que hizo quien ingresó. */
export default function MisPedidosPage() {
  const { filtros, cambiar } = useFiltrosUrl([]);
  const consulta = useMisPedidos(filtros);
  return (
    <div className="kt-body min-h-screen bg-white text-(--kt-ink)">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <h1 className="kt-display text-3xl font-bold sm:text-4xl">Mis pedidos</h1>
        {consulta.isPending ? <Cargando texto="Cargando tus pedidos" className="h-64" />
          : consulta.isError ? <ErrorReintentar consulta={consulta} mensaje="No pudimos cargar tus pedidos." />
            : consulta.data.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-(--kt-border) px-4 py-16 text-center">
                <ReceiptText size={44} aria-hidden="true" className="mx-auto text-slate-400" />
                <p className="mt-3 text-lg font-semibold">Todavía no hiciste pedidos con tu cuenta</p>
                <Link to="/catalogo" className={`${BOTON_PRIMARIO} mt-5`}>Ver el catálogo</Link>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-(--kt-border) overflow-hidden rounded-2xl border border-(--kt-border)">
                  {consulta.data.items.map((p) => (
                    <li key={p.numero}>
                      <Link to={`/pedido/${p.clave}`} className="flex items-center gap-3 p-4 hover:bg-(--kt-bg-soft)">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">Pedido #{p.numero}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${COLOR_ESTADO[p.estado]}`}>{NOMBRE_ESTADO[p.estado]}</span>
                          </span>
                          <span className="block truncate text-sm text-(--kt-ink-soft)">{fechaHora(p.creado_en)} · {p.unidades} {p.unidades === 1 ? "unidad" : "unidades"}: {p.resumen.join(", ")}</span>
                        </span>
                        <span className="font-bold tabular-nums">{formatearPrecio(p.total)}</span>
                        <ChevronRight size={18} aria-hidden="true" className="text-slate-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
                {consulta.data.paginacion.totalPages > 1 && <Pagination page={consulta.data.paginacion.page} pages={consulta.data.paginacion.totalPages} total={consulta.data.paginacion.total} onChange={(page) => cambiar({ page: String(page) })} />}
              </>
            )}
      </div>
    </div>
  );
}
