import { lazy } from "react";
import { rutasTorneos, rutasPanelTorneos } from "./rutas.jsx";
import CampanaAvisos from "./avisos/campana_avisos.jsx";
import AvisoPlan from "./plan/aviso_plan.jsx";

// Pantallas y componentes que el core monta para este rubro (ver proyecto/pantallas_modulos.jsx).
// Diferidos para no sumarlos al bundle inicial: el core los envuelve en Suspense.
export const pantallasTorneos = {
  codigo: "torneos",
  rutasTienda: rutasTorneos,
  rutasPanel: rutasPanelTorneos,
  // Campanita del jugador (invitaciones, comprobantes, novedades): junto al ingreso.
  extrasNavbar: [CampanaAvisos],
  // Aviso al organizador con el plan por vencer o vencido, debajo de la barra (SIS-57).
  avisosSitio: [AvisoPlan],
  ResumenPanel: lazy(() => import("./admin/resumen_panel.jsx")),
};
