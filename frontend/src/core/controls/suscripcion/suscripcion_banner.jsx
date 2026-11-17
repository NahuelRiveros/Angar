import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/auth_context";
import { getEstadoSuscripcion } from "../../api/suscripcion_api";
import { suscripcionDelSoftwareActiva } from "../../../../../core/suscripcion_software_config.js";

const DURACION_MS = 5000;

export default function SuscripcionBanner() {
  const { usuario, isAuth } = useAuth();
  const navigate            = useNavigate();
  const [estado, setEstado]   = useState(null);
  const [visible, setVisible] = useState(true);
  const [progreso, setProgreso] = useState(100); // 100 → 0 en DURACION_MS

  // Con la suscripción del software apagada (SIS-56) no se consulta ni se avisa nada.
  const esAdmin = suscripcionDelSoftwareActiva && isAuth && usuario?.roles?.includes("admin");

  useEffect(() => {
    if (!esAdmin) return;

    function verificar() {
      getEstadoSuscripcion()
        .then((r) => {
          if (r.ok && ["aviso", "gracia", "vencido"].includes(r.estado)) {
            setEstado(r);
            setVisible(true);
            setProgreso(100);
          } else {
            setEstado(null);
          }
        })
        .catch(() => {});
    }

    verificar();
    const intervalo = setInterval(verificar, 15 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [esAdmin]);

  // Auto-cierre a los 5 segundos + barra de progreso
  useEffect(() => {
    if (!estado || !visible) return;

    const inicio = Date.now();
    const tick = setInterval(() => {
      const transcurrido = Date.now() - inicio;
      const restante = Math.max(0, 100 - (transcurrido / DURACION_MS) * 100);
      setProgreso(restante);
      if (restante === 0) {
        clearInterval(tick);
        setVisible(false);
      }
    }, 50);

    return () => clearInterval(tick);
  }, [estado, visible]);

  if (!esAdmin || !estado || !visible) return null;

  return (
    <div className="w-full bg-blue-600 text-white shadow-md relative overflow-hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <AlertTriangle size={15} className="shrink-0 text-blue-200" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{estado.mensaje}</p>
        </div>
        <button
          onClick={() => navigate("/admin/suscripcion")}
          className="shrink-0 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-bold transition"
        >
          <span className="flex items-center gap-1.5">
            <CreditCard size={11} /> Renovar
          </span>
        </button>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 opacity-60 hover:opacity-100 transition"
        >
          <X size={14} />
        </button>
      </div>

      {/* Barra de progreso que se consume en 5s */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-white/40"
        style={{ width: `${progreso}%` }}
      />
    </div>
  );
}
