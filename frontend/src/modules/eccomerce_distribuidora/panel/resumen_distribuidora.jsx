import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, PackageX, Timer, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { ESTADOS, orderConfig } from "../../../config/order_config.js";
import { money } from "../../../controls/pedidos/order_format.js";
import AdminStatCard from "../../../controls/ui/admin_stat_card.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import { getResumenPanel } from "../api/panel_api.js";

// Mismos roles que el servidor (panel_distribuidora_service.js): el resto no pide el resumen.
const ROLES_RESUMEN = [...new Set([...orderConfig.managementRoles, "admin", "staff", "super_admin"])];
const fecha = (valor) => new Date(valor).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const RUTA_NOTAS = "/distribuidora/admin/notas-pedido";

function TarjetaEnlace({ to, children }) {
  return <Link to={to} className="block rounded-2xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)">{children}</Link>;
}

function Pedidos({ pedidos }) {
  const { por_estado, por_cobrar, ventas, ultimos } = pedidos;
  return (
    <section aria-labelledby="panel-pedidos" className="space-y-4">
      <h2 id="panel-pedidos" className="text-lg font-bold text-(--kt-ink)">{por_cobrar ? "Pedidos y cobros" : "Pedidos"}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaEnlace to={`${RUTA_NOTAS}?estado=pendiente`}>
          <AdminStatCard icon={ClipboardList} iconBg="bg-amber-50" iconColor="text-amber-700" label={`${ESTADOS.pendiente?.label ?? "Recibidos"} (para atender)`} value={por_estado.pendiente ?? 0} sub="Ver pedidos recibidos" />
        </TarjetaEnlace>
        <TarjetaEnlace to={`${RUTA_NOTAS}?estado=en_curso`}>
          <AdminStatCard icon={Timer} iconBg="bg-blue-50" iconColor="text-blue-700" label={ESTADOS.en_curso?.label ?? "En preparación"} value={por_estado.en_curso ?? 0} sub="Ver pedidos en preparación" />
        </TarjetaEnlace>
        {/* Los montos solo llegan para admin y super_admin; el resto ve únicamente cantidades. */}
        {por_cobrar && (
          <TarjetaEnlace to={RUTA_NOTAS}>
            <AdminStatCard icon={Wallet} iconBg="bg-rose-50" iconColor="text-rose-700" label="Saldo por cobrar" value={money(por_cobrar.saldo)} sub={`${por_cobrar.pedidos} pedido(s) con cobro pendiente o parcial`} />
          </TarjetaEnlace>
        )}
        {ventas && (
          <AdminStatCard icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-700" label="Ventas de hoy" value={money(ventas.hoy.monto)}
            sub={`${ventas.hoy.pedidos} pedido(s) hoy · Mes: ${money(ventas.mes.monto)} en ${ventas.mes.pedidos} pedido(s)`} />
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold text-(--kt-ink)">Últimos pedidos</h3>
          <Link to={RUTA_NOTAS} className="min-h-11 content-center text-sm font-semibold text-(--kt-teal-700) underline-offset-2 hover:underline">Ver todos</Link>
        </div>
        {ultimos.length === 0
          ? <AdminEmptyState icon={ClipboardList} title="Todavía no llegaron pedidos." />
          : <ul className="divide-y divide-slate-100">
            {ultimos.map((nota) => (
              <li key={nota.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">Pedido #{nota.id} · {nota.cliente ?? "Cliente"}</p>
                  <p className="text-xs text-slate-500">{fecha(nota.fecha_alta)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[nota.estado]?.className ?? ""}`}>{ESTADOS[nota.estado]?.label ?? nota.estado}</span>
                  <span className="font-bold">{money(nota.total)}</span>
                </div>
              </li>
            ))}
          </ul>}
      </div>
    </section>
  );
}

function Stock({ stock }) {
  return (
    <section aria-labelledby="panel-stock" className="space-y-4">
      <h2 id="panel-stock" className="text-lg font-bold text-(--kt-ink)">Stock</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stock.sin_stock ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              <PackageX aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="font-bold text-(--kt-ink)">{stock.sin_stock ? `${stock.sin_stock} presentación(es) sin stock` : "Todas las presentaciones tienen stock"}</p>
              <p className="text-xs text-slate-500">{stock.productos_activos} producto(s) activos · solo cuentan las presentaciones que controlan stock</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4">
            {stock.sin_stock > 0 && <Link to="/distribuidora/admin/productos?stock=sin_stock" className="min-h-11 content-center text-sm font-semibold text-(--kt-teal-700) underline-offset-2 hover:underline">Ver sin stock</Link>}
            <Link to="/distribuidora/admin/productos?stock=bajo_minimo" className="min-h-11 content-center text-sm font-semibold text-(--kt-teal-700) underline-offset-2 hover:underline">Ver stock bajo</Link>
          </div>
        </div>
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${stock.bajo_minimo ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600"}`}>
          {stock.bajo_minimo ? `${stock.bajo_minimo} artículo(s) en o por debajo de su stock mínimo: conviene reponer.` : "Ningún artículo está por debajo de su stock mínimo."}
        </p>
        {stock.ejemplos_sin_stock.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {stock.ejemplos_sin_stock.map((v) => <li key={v.id} className="truncate">• {v.producto} — {v.presentacion}</li>)}
            {stock.sin_stock > stock.ejemplos_sin_stock.length && <li className="text-xs text-slate-500">y {stock.sin_stock - stock.ejemplos_sin_stock.length} más</li>}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Resumen de la distribuidora en el inicio del panel. Cada sección llega solo si el rol la puede ver. */
export default function ResumenDistribuidora() {
  const { usuario } = useAuth();
  const puedeVer = (usuario?.roles ?? []).some((rol) => ROLES_RESUMEN.includes(rol));
  // Sin refresco automático: se actualiza al volver al inicio (cada consulta despierta la base).
  const resumen = useQuery({ queryKey: ["panel-resumen", usuario?.usuario_id], queryFn: getResumenPanel, enabled: puedeVer, staleTime: 60_000 });

  if (!puedeVer) return null;
  if (resumen.isPending) return <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>;
  if (resumen.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <span className="flex items-center gap-2"><AlertTriangle aria-hidden="true" size={18} />No pudimos cargar el resumen.</span>
        <button type="button" onClick={() => resumen.refetch()} className="min-h-11 rounded-xl bg-white px-4 font-semibold shadow-sm">Reintentar</button>
      </div>
    );
  }
  const { pedidos, stock } = resumen.data;
  return <div className="space-y-8">{pedidos && <Pedidos pedidos={pedidos} />}{stock && <Stock stock={stock} />}</div>;
}
