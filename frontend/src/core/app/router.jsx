import { Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import AppLayout from "../controls/layout/app_layout.jsx";
import PanelLayout from "../controls/layout/panel/panel_layout.jsx";

import { generalRoutes } from "./routes/general.routes.jsx";
import { panelRoutes } from "./routes/panel.routes.jsx";
import { pantallasActivas } from "../../proyecto/pantallas_modulos.jsx";

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
      ...pantallasActivas.flatMap((pantallas) => pantallas.rutasTienda ?? []),
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
