import { Share2 } from "lucide-react";
import { useToast } from "../../../controls/toast/toast_context.jsx";

/** En el celular abre el menú de compartir (WhatsApp, etc.); en la compu copia el link. */
export default function BotonCompartir({ titulo, ruta, className = "" }) {
  const toast = useToast();
  const url = new URL(ruta, window.location.origin).href;

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: `Seguí ${titulo} en MiPadel`, url });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return; // cerró el menú sin compartir
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado: pegalo donde quieras compartirlo.");
    } catch {
      toast.error(`No se pudo copiar. El link es: ${url}`);
    }
  }

  return (
    <button type="button" onClick={compartir} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${className}`}>
      <Share2 size={16} aria-hidden="true" /> Compartir
    </button>
  );
}
