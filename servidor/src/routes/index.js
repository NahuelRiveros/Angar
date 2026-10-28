import { Router } from "express";
import { sequelize } from "../database/sequelize.js";

import { authRouter } from "./usuarios/auth_router.js";
import { adminUsuariosRouter } from "./usuarios/admin_usuarios_router.js";
import { registradosRouter } from "./usuarios/registrados_router.js";
import { catalogosRouter } from "./sistema/catalogos_router.js";
import { staffRouter } from "./usuarios/staff_router.js";
import { permisosRouter } from "./usuarios/permisos_router.js";
import { suscripcionRouter } from "./suscripciones/suscripcion_router.js";
import { homeRouter } from "./home/home_router.js";
import { ubicacionRouter } from "./ubicacion/ubicacion_router.js";
import { bannerAnuncioRouter } from "./sistema/banner_anuncio_router.js";
import { uploadRouter } from "./upload_router.js";
import { torneoRouter } from "./torneos/torneo_router.js";
import { inscripcionJugadorRouter, torneoPublicoRouter, jugadorRouter } from "./torneos/jugador_router.js";

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


/**
 * 🔽 TUS ROUTES
 */
router.use("/catalogos", catalogosRouter);
router.use("/admin/usuarios", adminUsuariosRouter);
router.use("/admin/registrados", registradosRouter);
router.use("/auth", authRouter);
router.use("/staff", staffRouter);
router.use("/permisos", permisosRouter);                // ← roles y permisos del equipo
router.use("/suscripcion", suscripcionRouter);       // ← plan de cada organizador (y aviso de MercadoPago)
router.use("/home",  homeRouter);                     // ← contenido configurable del home (GET público)
router.use("/ubicacion", ubicacionRouter);            // ← provincia/departamento/localidad (público, sin auth)
router.use("/banner", bannerAnuncioRouter);           // ← cinta de anuncios (GET público, gestión solo super_admin)
router.use("/upload", uploadRouter);                  // ← subida genérica de imágenes (Cloudinary)
router.use("/torneos", torneoRouter);                // ← torneos del organizador (categorías, reglas y premios)
router.use("/inscripciones", inscripcionJugadorRouter); // ← el jugador se anota y ve sus inscripciones
router.use("/jugadores", jugadorRouter);                 // ← perfil propio y público (código de jugador)
router.use("/publico/torneos", torneoPublicoRouter);    // ← torneos publicados (sin cuenta)

export default router;
