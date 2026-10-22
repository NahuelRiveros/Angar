import { Router } from "express";
import { sequelize } from "../database/sequelize.js"; // 👈 IMPORTANTE

import { authRouter } from "./usuarios/auth_router.js";
import { adminUsuariosRouter } from "./usuarios/admin_usuarios_router.js";
import { catalogosRouter } from "./sistema/catalogos_router.js";
import { staffRouter } from "./usuarios/staff_router.js";
import { permisosRouter } from "./usuarios/permisos_router.js";
import { suscripcionRouter } from "./sistema/suscripcion_router.js";
import { stockRouter } from "./stock/stock_router.js";
import { homeRouter } from "./home/home_router.js";
import { modulosRouter } from "./sistema/modulos_router.js";
import { ubicacionRouter } from "./ubicacion/ubicacion_router.js";
import { bannerAnuncioRouter } from "./sistema/banner_anuncio_router.js";
import { verificarSuscripcion } from "../middleware/suscripcion_middleware.js";

// Módulo eccomerce_indumentaria (fase 1: catálogo, productos, carrito, upload
// — ver modules/eccomerce_indumentaria/CHANGELOG.md en el frontend). catalogosRouter tiene
// alias porque ya existe uno propio en ./sistema/catalogos_router.js
// (catálogos genéricos tipo_documento/sexo) — ambos cuelgan de /catalogos
// pero en subrutas distintas, no chocan.
import { catalogosRouter as catalogosProductosRouter } from "./productos/catalogos_router.js";
import { productoRouter } from "./productos/producto_router.js";
import { carritoRouter } from "./carrito/carrito_router.js";
import { uploadRouter } from "./upload_router.js";

// Módulo eccomerce_distribuidora — catálogo tipo supermercado + nota de
// pedido. Todo montado bajo /distribuidora/* para no compartir espacio de
// rutas con /catalogos, /productos, /carrito de eccomerce_indumentaria
// (son verticales separadas a propósito, ver frontend CHANGELOG del módulo).
import { catalogosDistribuidoraRouter } from "./distribuidora/catalogos_distribuidora_router.js";
import { productoDistribuidoraRouter } from "./distribuidora/producto_distribuidora_router.js";
import { carritoDistribuidoraRouter } from "./distribuidora/carrito_distribuidora_router.js";
import { notaPedidoRouter } from "./distribuidora/nota_pedido_router.js";
import { perfilClienteRouter } from "./distribuidora/perfil_cliente_router.js";
import { importacionDistribuidoraRouter } from "./distribuidora/importacion_distribuidora_router.js";
import { panelDistribuidoraRouter } from "./distribuidora/panel_distribuidora_router.js";
import { marcasDistribuidoraRouter } from "./distribuidora/marcas_distribuidora_router.js";
import { listasPrecioRouter } from "./distribuidora/listas_precio_router.js";

const router = Router();

/**
 * 🔥 HEALTH CHECK (SIN AUTH)
 */
// Render y el aviso de "despertando el servidor" la consultan seguido: por defecto
// NO toca la base, para que la base pueda suspenderse. `?bd=1` también prueba la base.
router.get("/health", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (req.query.bd !== "1") {
    return res.json({ ok: true, mensaje: "Servidor funcionando", base_de_datos: "sin_revisar" });
  }
  try {
    await sequelize.query("SELECT 1");

    return res.json({
      ok: true,
      mensaje: "Servidor y base funcionando",
      base_de_datos: "ok",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Servidor activo pero DB caída",
    });
  }
});

// Bloquea todas las rutas operativas si la suscripción está vencida.
// Siempre pasan: /health, /auth, /suscripcion, /catalogos
router.use(verificarSuscripcion);

/**
 * 🔽 TUS ROUTES
 */
router.use("/catalogos", catalogosRouter);
router.use("/admin/usuarios", adminUsuariosRouter);
router.use("/auth", authRouter);
router.use("/staff", staffRouter);
router.use("/permisos", permisosRouter);                // ← roles y permisos del personal
router.use("/suscripcion", suscripcionRouter);       // ← plan del software
router.use("/stock", stockRouter);                   // ← productos y movimientos de stock
router.use("/home",  homeRouter);                     // ← contenido configurable del home (GET público)
router.use("/modulos", modulosRouter);                // ← gestión de módulos de negocio habilitados
router.use("/ubicacion", ubicacionRouter);            // ← provincia/departamento/localidad (público, sin auth)
router.use("/banner", bannerAnuncioRouter);           // ← cinta de anuncios (GET público, gestión solo super_admin)

// ── eccomerce_indumentaria (fase 1) ───────────────────────────────────────
router.use("/catalogos", catalogosProductosRouter);   // ← categorías/marcas/talles/colores/envío/IVA
router.use("/productos", productoRouter);              // ← catálogo de productos + stock bajo + CSV
router.use("/carrito",   carritoRouter);                // ← carrito de compras
router.use("/upload",    uploadRouter);                 // ← subida genérica de imágenes (Cloudinary)

// ── eccomerce_distribuidora ────────────────────────────────────────────────
router.use("/distribuidora/catalogos",    catalogosDistribuidoraRouter); // ← /categorias (jerárquicas)
router.use("/distribuidora/productos",    productoDistribuidoraRouter);  // ← productos + variedades (precio/stock propio)
router.use("/distribuidora/carrito",      carritoDistribuidoraRouter);   // ← "nota de pedido" en construcción
router.use("/distribuidora/notas-pedido", notaPedidoRouter);             // ← pedidos ya enviados (inmutables)
router.use("/distribuidora/mi-perfil",    perfilClienteRouter);           // ← CUIT/dirección — se pide recién al enviar el primer pedido
router.use("/distribuidora/importacion",  importacionDistribuidoraRouter); // ← carga masiva de productos desde Excel/CSV
router.use("/distribuidora/panel",        panelDistribuidoraRouter);      // ← resumen del panel de gestión
router.use("/distribuidora/marcas",       marcasDistribuidoraRouter);     // ← marcas y dónde se ofrecen
router.use("/distribuidora/listas-precio", listasPrecioRouter);          // ← listas de precios regionales (solo admin)

export default router;