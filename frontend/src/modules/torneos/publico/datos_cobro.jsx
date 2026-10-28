import { Copy, Landmark } from "lucide-react";
import { useToast } from "../../../controls/toast/toast_context.jsx";

const CAMPOS = [["cobro_titular", "Titular"], ["cobro_banco", "Banco o billetera"], ["cobro_cbu", "CBU / CVU"], ["cobro_alias", "Alias"]];
const COPIABLES = new Set(["cobro_cbu", "cobro_alias"]);

const tieneDatosDeCobro = (torneo) => Boolean(torneo?.cobro_cbu || torneo?.cobro_alias);

/** Cuenta donde transferir la inscripción, con CBU y alias para copiar. Nada si el torneo no la cargó. */
export default function DatosDeCobro({ torneo, titulo = "Cómo pagar la inscripción", children }) {
  const toast = useToast();
  if (!tieneDatosDeCobro(torneo)) return null;

  async function copiar(valor, etiqueta) {
    try {
      await navigator.clipboard.writeText(valor);
      toast.success(`${etiqueta} copiado`);
    } catch {
      toast.error("No se pudo copiar: seleccionalo y copialo a mano.");
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
      <p className="flex items-center gap-1.5 font-bold text-(--kt-ink)"><Landmark size={16} aria-hidden="true" className="text-(--kt-teal-700)" /> {titulo}</p>
      <dl className="space-y-1">
        {CAMPOS.filter(([campo]) => torneo[campo]).map(([campo, etiqueta]) => (
          <div key={campo} className="flex flex-wrap items-center gap-x-2">
            <dt className="text-(--kt-ink-soft)">{etiqueta}:</dt>
            <dd className={`font-semibold text-(--kt-ink) ${campo === "cobro_cbu" ? "font-mono break-all" : ""}`}>{torneo[campo]}</dd>
            {COPIABLES.has(campo) && (
              <button type="button" onClick={() => copiar(torneo[campo], etiqueta)} aria-label={`Copiar ${etiqueta}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-(--kt-teal-700) hover:bg-white">
                <Copy size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}
