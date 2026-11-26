import { lazy } from "react";
import { protegida } from "../../app/routes/route_helpers.jsx";

const StockPage = lazy(() => import("./admin/stock_page.jsx"));

export const pantallasStock = {
  codigo: "stock",
  rutasPanel: [{ path: "/admin/stock", element: protegida(<StockPage />, { permisos: ["stock.mover"] }) }],
};
