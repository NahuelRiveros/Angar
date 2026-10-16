import { QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { orderConfig } from "../../../../order_config.js";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
export const ROLES_PANEL_PEDIDOS = orderConfig.managementRoles;
export const ROLES_PANEL_STOCK = ["admin", "staff"];
// Montos (ventas y saldo por cobrar): solo los dueños del negocio, nunca staff ni vendedor.
export const ROLES_PANEL_FINANZAS = ["admin", "super_admin"];
export const ROLES_PANEL = [...new Set([...ROLES_PANEL_PEDIDOS, ...ROLES_PANEL_STOCK, ...ROLES_PANEL_FINANZAS])];

const tieneRol = (roles, permitidos) => roles.some((rol) => permitidos.includes(rol));
const consulta = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

async function resumenPedidos(ahora, { finanzas }) {
  // "Hoy" y "este mes" se cuentan en hora de Argentina, no en la del servidor (Render usa UTC).
  // `unidad` es siempre una constante de acá ('day' o 'month'), nunca un dato del usuario.
  const inicio = (unidad) => `(date_trunc('${unidad}', CAST(:ahora AS timestamptz) AT TIME ZONE :zona) AT TIME ZONE :zona)`;
  // Sin permiso de finanzas ni se consultan los montos: no viajan en la respuesta.
  const sinFinanzas = Promise.resolve([null]);
  const [porEstado, [cobro], [ventas], ultimos] = await Promise.all([
    consulta("SELECT estado, count(*)::int AS cantidad FROM nota_pedido GROUP BY estado"),
    !finanzas ? sinFinanzas : consulta(`SELECT coalesce(sum(total - monto_pagado), 0) AS saldo, count(*)::int AS pedidos
      FROM nota_pedido WHERE estado <> 'cancelada' AND estado_pago <> 'pagado'`),
    !finanzas ? sinFinanzas : consulta(`SELECT
        count(*) FILTER (WHERE fecha_alta >= ${inicio("day")})::int AS pedidos_hoy,
        coalesce(sum(total) FILTER (WHERE fecha_alta >= ${inicio("day")}), 0) AS monto_hoy,
        count(*)::int AS pedidos_mes,
        coalesce(sum(total), 0) AS monto_mes
      FROM nota_pedido
      WHERE estado <> 'cancelada' AND fecha_alta >= ${inicio("month")} AND fecha_alta <= CAST(:ahora AS timestamptz)`,
    { ahora, zona: ZONA_HORARIA }),
    consulta(`SELECT n.id, n.estado, n.estado_pago, n.total, n.fecha_alta, p.nombre, p.apellido
      FROM nota_pedido n
      LEFT JOIN usuario u ON u.id = n.usuario_id
      LEFT JOIN persona p ON p.id = u.persona_id
      ORDER BY n.fecha_alta DESC, n.id DESC LIMIT 5`),
  ]);

  const cantidades = Object.fromEntries(porEstado.map((fila) => [fila.estado, fila.cantidad]));
  return {
    por_estado: Object.fromEntries(Object.keys(orderConfig.states).map((estado) => [estado, cantidades[estado] ?? 0])),
    por_cobrar: cobro && { saldo: Number(cobro.saldo), pedidos: cobro.pedidos },
    ventas: ventas && {
      hoy: { pedidos: ventas.pedidos_hoy, monto: Number(ventas.monto_hoy) },
      mes: { pedidos: ventas.pedidos_mes, monto: Number(ventas.monto_mes) },
    },
    ultimos: ultimos.map((n) => ({
      id: n.id, estado: n.estado, estado_pago: n.estado_pago, total: Number(n.total), fecha_alta: n.fecha_alta,
      cliente: [n.nombre, n.apellido].filter(Boolean).join(" ") || null,
    })),
  };
}

async function resumenStock() {
  const vigentes = `FROM variedad_distribuidora v JOIN producto_distribuidora p ON p.id = v.producto_id
    WHERE v.fecha_baja IS NULL AND p.fecha_baja IS NULL AND p.activo`;
  const sinStock = `${vigentes} AND v.controla_stock AND v.cantidad <= 0`;
  // Incluye los agotados: el mínimo marca cuándo reponer.
  const bajoMinimo = `${vigentes} AND v.controla_stock AND v.stock_minimo > 0 AND v.cantidad <= v.stock_minimo`;
  const [[totales], ejemplos] = await Promise.all([
    consulta(`SELECT (SELECT count(*)::int ${sinStock}) AS sin_stock,
      (SELECT count(*)::int ${bajoMinimo}) AS bajo_minimo,
      (SELECT count(DISTINCT p.id)::int ${vigentes}) AS productos_activos`),
    consulta(`SELECT v.id, p.nombre AS producto, v.nombre AS presentacion ${sinStock} ORDER BY p.nombre, v.nombre LIMIT 5`),
  ]);
  return { sin_stock: totales.sin_stock, bajo_minimo: totales.bajo_minimo, productos_activos: totales.productos_activos, ejemplos_sin_stock: ejemplos };
}

/**
 * Dashboard del panel en un solo pedido. Cada sección se calcula solo si el rol
 * la puede ver: un vendedor no recibe el stock, un staff de catálogo sí, y
 * por_cobrar/ventas llegan en null salvo para ROLES_PANEL_FINANZAS.
 */
export async function obtenerResumenPanel(roles = [], { ahora = new Date() } = {}) {
  const finanzas = tieneRol(roles, ROLES_PANEL_FINANZAS);
  const [pedidos, stock] = await Promise.all([
    finanzas || tieneRol(roles, ROLES_PANEL_PEDIDOS) ? resumenPedidos(ahora.toISOString(), { finanzas }) : null,
    tieneRol(roles, ROLES_PANEL_STOCK) ? resumenStock() : null,
  ]);
  return { pedidos, stock };
}
