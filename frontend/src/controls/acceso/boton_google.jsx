import { useEffect, useRef, useState } from "react";
import FormError from "../ui/form_error.jsx";

const URL_SCRIPT = "https://accounts.google.com/gsi/client";
let cargaScript = null;

// Una sola carga por página aunque haya varios botones; si falla, se puede reintentar.
function cargarScriptGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  cargaScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = URL_SCRIPT;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { cargaScript = null; script.remove(); reject(new Error("No se pudo cargar Google")); };
    document.head.appendChild(script);
  });
  return cargaScript;
}

/**
 * Botón oficial "Continuar con Google". Google entrega un comprobante firmado
 * (credencial) que se pasa a `onCredencial`; el servidor lo verifica.
 */
export default function BotonGoogle({ clientId, onCredencial, texto = "continue_with" }) {
  const contenedor = useRef(null);
  const onCredencialRef = useRef(onCredencial);
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => { onCredencialRef.current = onCredencial; }, [onCredencial]);

  useEffect(() => {
    let activo = true;
    cargarScriptGoogle()
      .then(() => {
        if (!activo || !contenedor.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            setError("");
            setEstado("enviando");
            try {
              await onCredencialRef.current(credential);
            } catch (e) {
              setError(e.response?.data?.mensaje || "No se pudo ingresar con Google. Intentá de nuevo.");
              setEstado("listo");
            }
          },
        });
        // Google no acepta anchos en %: se usa el del contenedor (máximo 400 px).
        const ancho = Math.min(400, Math.max(200, contenedor.current.offsetWidth));
        window.google.accounts.id.renderButton(contenedor.current, { theme: "outline", size: "large", shape: "pill", text: texto, width: ancho, locale: "es" });
        setEstado("listo");
      })
      .catch(() => { if (activo) setEstado("error"); });
    return () => { activo = false; };
  }, [clientId, texto, intento]);

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-500" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />o<span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="relative flex min-h-11 items-center justify-center">
        <div ref={contenedor} className={`flex w-full justify-center ${estado === "enviando" ? "pointer-events-none opacity-50" : ""}`} hidden={estado === "error"} />
        {estado === "cargando" && <p className="absolute text-sm text-slate-500" role="status">Cargando Google…</p>}
        {estado === "enviando" && <p className="absolute text-sm font-semibold text-slate-700" role="status">Ingresando con Google…</p>}
      </div>
      {estado === "error" && (
        <div className="text-center text-sm text-slate-600">
          <p>No pudimos cargar el botón de Google. Revisá tu conexión.</p>
          <button type="button" className="mt-1 py-2 font-semibold text-(--kt-teal-700)" onClick={() => { setEstado("cargando"); setIntento((n) => n + 1); }}>Reintentar</button>
        </div>
      )}
      <FormError message={error} />
    </div>
  );
}
