import {
  Jugador, AvisoUsuario,
  HomeArea, HomeContenido, HomeTexto, HomePilar, HomeContacto,
  Suscripcion, PagoSuscripcion,
  Torneo, TorneoCategoria, TorneoPremio, Zona, Inscripcion, Partido,
} from "./models/index.js";
import { torneoRouter } from "./routes/torneos/torneo_router.js";
import { inscripcionJugadorRouter, torneoPublicoRouter, jugadorRouter } from "./routes/torneos/jugador_router.js";
import { suscripcionRouter } from "./routes/suscripciones/suscripcion_router.js";
import { avisosRouter } from "./routes/usuarios/avisos_router.js";
import { homeRouter } from "./routes/home/home_router.js";
import { adminUsuariosRouter } from "./routes/usuarios/admin_usuarios_router.js";
import { registradosRouter } from "./routes/usuarios/registrados_router.js";
import { demoRouter } from "./routes/sistema/demo_router.js";
import { arranque_torneos, seed_torneos } from "./arranque.js";

// Lo que el core necesita saber de este rubro (ver proyecto/modulos.js).
export const moduloTorneos = {
  codigo: "torneos",
  descripcion: "Torneos de pádel",

  // Orden de creación: cada tabla después de las que referencia.
  modelos: [
    Jugador,         // jugador → usuario
    AvisoUsuario,    // aviso_usuario → usuario
    HomeArea,
    HomeContenido,   // home_contenido → home_area
    HomeTexto,
    HomePilar,
    HomeContacto,
    Suscripcion,     // suscripcion → usuario
    PagoSuscripcion, // pago_suscripcion → usuario
    Torneo,          // torneo → usuario
    TorneoCategoria, // torneo_categoria → torneo
    TorneoPremio,    // torneo_premio → torneo_categoria
    Zona,            // zona → torneo_categoria
    Inscripcion,     // inscripcion → torneo, torneo_categoria, usuario, zona
    Partido,         // partido → torneo_categoria, zona, inscripcion
  ],

  rutas: [
    ["/torneos", torneoRouter],                     // torneos del organizador (categorías, reglas, juego)
    ["/inscripciones", inscripcionJugadorRouter],   // el jugador se anota y ve sus inscripciones
    ["/jugadores", jugadorRouter],                  // perfil propio y público (código de jugador)
    ["/publico/torneos", torneoPublicoRouter],      // torneos publicados (sin cuenta)
    ["/plan-organizador", suscripcionRouter],       // plan de cada organizador y aviso de MercadoPago (D2)
    ["/avisos", avisosRouter],                      // campanita del jugador
    ["/home", homeRouter],                          // portada editable (GET público)
    ["/admin/usuarios", adminUsuariosRouter],       // organizadores (equipo de la plataforma)
    ["/admin/registrados", registradosRouter],      // registrados (super admin)
    ["/admin/demo", demoRouter],                    // torneos demo (super admin)
  ],

  arranque: arranque_torneos,
  seed: seed_torneos,
};
