import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/app/query_client.js";
import { router } from "./core/app/router.jsx";
import { AuthProvider } from "./core/auth/auth_context.jsx"; // Login Futuro
import { ToastProvider } from "./core/controls/toast/toast_context.jsx";
import { pantallasActivas } from "./proyecto/pantallas_modulos.jsx";
import "./core/controls/config/apply_brand_theme.js";
import "./index.css"

// Cada módulo de rubro puede aportar un proveedor (ej. su carrito) alrededor del router.
const app = pantallasActivas
  .flatMap((pantallas) => (pantallas.Proveedor ? [pantallas.Proveedor] : []))
  .reduceRight((hijos, Proveedor) => <Proveedor>{hijos}</Proveedor>, <RouterProvider router={router} />);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {app}
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
 
