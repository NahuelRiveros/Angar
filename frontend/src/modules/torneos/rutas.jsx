import { lazy } from "react";
import { protegida } from "../../core/app/routes/route_helpers.jsx";
const MiSuscripcionPage = lazy(() => import("./plan/mi_suscripcion_page.jsx"));
const MisTorneosPage = lazy(() => import("./organizador/mis_torneos_page.jsx"));
const TorneoDetallePage = lazy(() => import("./organizador/torneo_detalle_page.jsx"));
const ImprimirTorneoPage = lazy(() => import("./organizador/imprimir_torneo_page.jsx"));
const TorneosPublicosPage = lazy(() => import("./publico/torneos_publicos_page.jsx"));
const TorneoPublicoPage = lazy(() => import("./publico/torneo_publico_page.jsx"));
const MisInscripcionesPage = lazy(() => import("./inscripciones/mis_inscripciones_page.jsx"));
const MiPerfilPage = lazy(() => import("./jugadores/perfil_pages.jsx").then((m) => ({ default: m.MiPerfilPage })));
const PerfilPublicoPage = lazy(() => import("./jugadores/perfil_pages.jsx").then((m) => ({ default: m.PerfilPublicoPage })));
const SuscripcionesPage = lazy(() => import("./admin/suscripciones_page.jsx"));

// El organizador maneja sus torneos; el super admin puede entrar a cualquiera. Lo público no pide cuenta.
const ORGANIZA = ["organizador", "super_admin"];

export const rutasTorneos = [
  { path: "/torneos", element: <TorneosPublicosPage /> },
  { path: "/torneos/:torneoId", element: <TorneoPublicoPage /> },
  { path: "/jugadores/:codigo", element: <PerfilPublicoPage /> },
  { path: "/mi-perfil", element: protegida(<MiPerfilPage />) },
  { path: "/mis-inscripciones", element: protegida(<MisInscripcionesPage />) },
  { path: "/mi-suscripcion", element: protegida(<MiSuscripcionPage />) },
  { path: "/mis-torneos", element: protegida(<MisTorneosPage />, ORGANIZA) },
  { path: "/mis-torneos/:torneoId", element: protegida(<TorneoDetallePage />, ORGANIZA) },
  { path: "/mis-torneos/:torneoId/imprimir", element: protegida(<ImprimirTorneoPage />, ORGANIZA) },
];

// Panel de gestión: el equipo de la plataforma (el servidor vuelve a verificar cada permiso).
export const rutasPanelTorneos = [
  { path: "/admin/suscripciones", element: protegida(<SuscripcionesPage />, { permisos: ["suscripciones.ver"] }) },
];
