import { createContext, useContext } from "react";

// Separado del proveedor (toast_context.jsx) para que ese archivo solo exporte
// componentes y el recargado en caliente de Vite siga funcionando.
export const ToastContext = createContext(null);

// Fallback a console.* si se usa fuera del provider — nunca rompe la UI.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;

  return {
    success: console.log,
    error: console.error,
    warning: console.warn,
    info: console.info,
  };
}
