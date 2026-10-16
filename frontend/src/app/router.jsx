import { Suspense } from "react";
import { projectModules } from "../config/gate_config.js";
import { createBrowserRouter, Outlet } from "react-router-dom";
import AppLayout from "../controls/layout/app_layout.jsx";
import PanelLayout from "../controls/layout/panel/panel_layout.jsx";

import { generalRoutes } from "./routes/general.routes.jsx";
import { panelRoutes } from "./routes/panel.routes.jsx";
import { eccomerceIndumentariaRoutes } from "./routes/eccomerce_indumentaria.routes.jsx";
import { eccomerceDistribuidoraRoutes } from "./routes/eccomerce_distribuidora.routes.jsx";
import { gymRoutes } from "./routes/gym.routes.jsx";
import { kinesiologiaRoutes } from "./routes/kinesiologia.routes.jsx";

const cargando = <p role="status" className="p-8 text-center">Cargando…</p>;

// Dos marcos: la tienda (navbar y footer) y el panel de gestión (menú lateral propio).
export const router = createBrowserRouter([
  {
    element: (
      <AppLayout>
        <Suspense fallback={cargando}><Outlet /></Suspense>
      </AppLayout>
    ),
    children: [
      ...generalRoutes,
      ...(projectModules.eccomerce_indumentaria ? eccomerceIndumentariaRoutes : []),
      ...eccomerceDistribuidoraRoutes,
      ...(projectModules.gym ? gymRoutes : []),
      ...(projectModules.kinesiologia ? kinesiologiaRoutes : []),
    ],
  },
  {
    element: (
      <PanelLayout>
        <Suspense fallback={cargando}><Outlet /></Suspense>
      </PanelLayout>
    ),
    children: panelRoutes,
  },
]);
