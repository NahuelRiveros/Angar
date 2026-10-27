import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, CreditCard, X } from "lucide-react";
import { useAuth } from "../../auth/auth_context.jsx";
import { useMiSuscripcion } from "../../hooks/use_mi_suscripcion.js";

// Cerrado hoy = no vuelve a aparecer hasta mañana (por navegador).
const CLAVE = "mipadel:aviso-plan-cerrado";
const hoy = () => new Date().toDateString();
function cerradoHoy() {
  try { return localStorage.getItem(CLAVE) === hoy(); } catch { return false; }
}

// Estas páginas muestran su propio aviso del plan: no se repite arriba.
const CON_AVISO_PROPIO = ["/mi-suscripcion", "/mis-torneos"];

/** Aviso al organizador cuando su plan está por vencer o vencido. */
export default function SuscripcionBanner() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const esOrganizador = (usuario?.roles ?? []).includes("organizador");
  const { data: plan } = useMiSuscripcion({ enabled: esOrganizador });
  const [cerrado, setCerrado] = useState(cerradoHoy);

  if (!esOrganizador || cerrado || CON_AVISO_PROPIO.some((ruta) => pathname.startsWith(ruta))) return null;
  if (!["por_vencer", "vencido"].includes(plan?.estado)) return null;

  const vencido = plan.estado === "vencido";
  function cerrar() {
    try { localStorage.setItem(CLAVE, hoy()); } catch { /* sin almacenamiento: se cierra solo por ahora */ }
    setCerrado(true);
  }

  return (
    <div role="status" className={`w-full ${vencido ? "bg-red-700 text-white" : "bg-amber-100 text-amber-950"}`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
        <p className="min-w-0 flex-1 text-xs font-semibold sm:text-sm">{plan.mensaje}</p>
        <Link to="/mi-suscripcion" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-current/15 px-3 text-xs font-bold hover:bg-current/25">
          <CreditCard size={14} aria-hidden="true" /> Renovar
        </Link>
        <button type="button" onClick={cerrar} aria-label="Cerrar aviso" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-current/15">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
