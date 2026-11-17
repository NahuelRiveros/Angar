import { useEffect, useRef } from "react";
import SubmitButton from "../ui/submit_button";
import { CheckCircle } from "lucide-react";

export default function WelcomeModal({
  nombre,
  apellido,
  onFinish,
  delayMs = 5000, // ⏱️ 5 segundos
}) {
  const timerRef = useRef(null);

  // ⏱️ Auto-navegación
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onFinish();
    }, delayMs);

    return () => clearTimeout(timerRef.current);
  }, [onFinish, delayMs]);

  // 👉 Click manual
  function continuarAhora() {
    clearTimeout(timerRef.current);
    onFinish();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[var(--z-modal)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center">

        <CheckCircle className="mx-auto text-green-600" size={48} />

        <h2 className="text-2xl font-bold mt-4">
          ¡Bienvenido al sistema!
        </h2>

        {(nombre || apellido) && (
          <p className="text-gray-700 mt-2">
            {nombre} {apellido}
          </p>
        )}

        <p className="text-sm text-gray-500 mt-1">
          Acceso concedido correctamente
        </p>

        <p className="text-xs text-gray-400 mt-3">
          Redirigiendo automáticamente…
        </p>

        <div className="mt-6 flex justify-center">
          <SubmitButton
            label="Continuar ahora"
            onClick={continuarAhora}
          />
        </div>
      </div>
    </div>
  );
}
