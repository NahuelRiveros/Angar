import { Link } from "react-router-dom";
import { ChevronRight, ReceiptText } from "lucide-react";
import Pagination from "../../../controls/ui/pagination.jsx";
import { formatearPrecio } from "../../../utils/dinero.js";
import { BOTON_PRIMARIO } from "../../../controls/ui/estilos.js";
import { Cargando, ErrorReintentar } from "../../../controls/ui/estados_web.jsx";
import { useFiltrosUrl } from "../../../hooks/use_filtros_url.js";
import Etiqueta from "../../../controls/ui/etiqueta.jsx";
import { NOMBRE_ESTADO, TONO_ESTADO } from "../estados.js";
import { useMisPedidos } from "../hooks.js";
import { formatearFechaHora } from "../../../utils/formatear_fecha.js";

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
                            <Etiqueta tono={TONO_ESTADO[p.estado]}>{NOMBRE_ESTADO[p.estado]}</Etiqueta>
                          </span>
                          <span className="block truncate text-sm text-(--kt-ink-soft)">{formatearFechaHora(p.creado_en)} · {p.unidades} {p.unidades === 1 ? "unidad" : "unidades"}: {p.resumen.join(", ")}</span>
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
