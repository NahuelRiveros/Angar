import { useEffect, useState } from "react";
import { AlertTriangle, ServerCrash, RefreshCw } from "lucide-react";
import { verificarServidor } from "../../api/health.js"; // 👈 ajustá ruta

export default function ServerStatusBanner() {
  const [caido, setCaido] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function checkServidor() {
    try {
      setCargando(true);
      await verificarServidor();
      setCaido(false);
    } catch (err) {
      console.error("Servidor caído:", err?.message);
      setCaido(true);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    checkServidor();

    const interval = setInterval(checkServidor, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!caido) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-blocking)] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl border-4 border-red-300 bg-white p-8 shadow-2xl text-center">
        
        <div className="mb-4 flex justify-center text-red-600">
          <ServerCrash size={48} />
        </div>

        <h2 className="text-3xl font-extrabold text-red-600">
          Servidor desconectado
        </h2>

        <p className="mt-3 text-lg text-gray-700">
          No se puede conectar con el sistema.
        </p>

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-left text-gray-800">
          <div className="flex items-center gap-2 font-bold text-yellow-700 mb-2">
            <AlertTriangle size={20} />
            Qué hacer
          </div>

          <p>
            Abrí el acceso directo del sistema desde el escritorio.
          </p>

          <p className="mt-2">
            Si ya está abierto, cerralo y volvé a ejecutarlo.
          </p>
        </div>

        <button
          onClick={checkServidor}
          disabled={cargando}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw size={18} className={cargando ? "animate-spin" : ""} />
          {cargando ? "Verificando..." : "Reintentar"}
        </button>

      </div>
    </div>
  );
}