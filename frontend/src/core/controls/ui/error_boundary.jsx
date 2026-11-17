import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// Class component porque React solo permite capturar errores de render con
// getDerivedStateFromError/componentDidCatch — no hay hook equivalente.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Algo salió mal</h2>
          <p className="max-w-sm text-sm text-slate-500">
            Ocurrió un error inesperado en esta página. Podés intentar recargarla.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition"
          >
            <RefreshCw size={13} /> Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
