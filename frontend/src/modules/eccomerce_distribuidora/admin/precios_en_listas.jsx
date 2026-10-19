import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../auth/auth_context.jsx";
import { getPreciosEnListas } from "../api/producto_distribuidora_api.js";
import { formatearPrecio } from "../utils/precio_iva.js";
import { RUTA_LISTAS } from "../utils/rutas_articulo.js";

/**
 * Pestaña Precios de la ficha: dónde cambia el precio de este artículo
 * (solo lectura). Se edita en Listas de precios, que es solo para admin.
 */
export default function PreciosEnListas({ productoId, activa }) {
  const { usuario } = useAuth();
  const esAdmin = (usuario?.roles ?? []).includes("admin");
  // Se pide recién al abrir la pestaña: la mayoría de las veces se edita otra cosa.
  const precios = useQuery({ queryKey: ["precios-en-listas", productoId], queryFn: () => getPreciosEnListas(productoId), enabled: activa, staleTime: 30_000 });
  if (!activa) return null;
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
      <p className="font-semibold text-(--kt-ink)">Precio en otras listas</p>
      {precios.isPending ? <p className="text-slate-500">Cargando…</p>
        : precios.isError ? <p className="text-rose-700">No pudimos cargar los precios por lista.</p>
          : precios.data.length === 0 ? <p className="text-slate-600">Se cobra el precio de arriba (General) en todas las localidades.</p>
            : (
              <ul className="space-y-1">
                {precios.data.map((p) => (
                  <li key={`${p.lista_id}-${p.variedad_id}`} className="flex flex-wrap justify-between gap-2">
                    <span>{p.lista}{!p.activo && <span className="ml-1 text-xs text-slate-500">(pausada)</span>}</span>
                    <span className="font-semibold">{formatearPrecio(p.precio)}{p.precio_anterior > p.precio && <span className="ml-1 text-xs font-normal text-slate-400 line-through">{formatearPrecio(p.precio_anterior)}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
      {esAdmin && <Link to={RUTA_LISTAS} className="inline-block min-h-11 content-center text-sm font-semibold text-(--kt-teal-700) underline">Editar en Listas de precios</Link>}
    </div>
  );
}
