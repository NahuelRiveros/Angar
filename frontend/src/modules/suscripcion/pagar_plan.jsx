import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, CreditCard, Hourglass, Upload } from "lucide-react";
import { useAuth } from "../../auth/auth_context.jsx";
import { useToast } from "../../controls/toast/toast_context.jsx";
import ErrorBanner from "../../controls/ui/error_banner.jsx";
import { cobroConfig } from "../../../../cobro_config.js";
import { crearPagoSuscripcion, avisarTransferencia } from "../../api/suscripcion_api.js";
import { claveMiSuscripcion } from "../../hooks/use_mi_suscripcion.js";
import { formatearPesos, formatearMomento } from "./estado_plan.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const MAX_MB = Math.round(cobroConfig.comprobante.maxBytes / 1024 / 1024);
const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// El servidor vuelve a validar el contenido real del archivo; esto avisa antes de subirlo.
const esquema = z.object({
  comprobante: z.custom((v) => v?.length === 1, "Adjuntá el comprobante.")
    .refine((v) => v[0].size <= cobroConfig.comprobante.maxBytes, `Puede pesar hasta ${MAX_MB} MB.`)
    .refine((v) => TIPOS.includes(v[0].type), "Tiene que ser una foto (JPG, PNG o WEBP) o un PDF."),
  nota: z.string().trim().max(300, "Hasta 300 caracteres."),
});

/** Cómo renovar: hoy transferencia; MercadoPago aparece solo si el servidor lo habilita. */
export default function PagarPlan({ plan }) {
  const { mercadopago, transferencia } = plan.medios_pago ?? {};
  return (
    <div className="mt-6 space-y-5 border-t border-(--kt-border) pt-5">
      <p className="text-sm text-(--kt-ink-soft)">
        {plan.precio_mensual > 0 && <><strong className="text-(--kt-ink)">{formatearPesos(plan.precio_mensual)}</strong> por {plan.dias_por_pago} días. </>}
        Si pagás antes de que venza, los días se suman al final: no perdés ninguno.
      </p>
      {transferencia && <PagoTransferencia datos={transferencia} ultima={plan.ultima_transferencia} />}
      {mercadopago && <PagoMercadoPago />}
      {!transferencia && !mercadopago && (
        <p className="rounded-2xl bg-(--kt-bg-soft) p-4 text-sm text-(--kt-ink)">Los medios de pago todavía no están cargados. Escribinos para renovar tu plan.</p>
      )}
    </div>
  );
}

function PagoMercadoPago() {
  const pagar = useMutation({ mutationFn: crearPagoSuscripcion, onSuccess: ({ url_pago }) => window.location.assign(url_pago) });
  return (
    <div>
      {pagar.isError && <ErrorBanner className="mb-3" message={mensajeDe(pagar.error, "No pudimos abrir MercadoPago. Probá de nuevo.")} />}
      <button type="button" disabled={pagar.isPending} onClick={() => pagar.mutate()}
        className={`${BOTON} w-full bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover) sm:w-auto`}>
        <CreditCard size={18} aria-hidden="true" /> {pagar.isPending ? "Abriendo MercadoPago…" : "Pagar con MercadoPago"}
      </button>
    </div>
  );
}

const CAMPOS = [["titular", "Titular"], ["banco", "Banco"], ["cbu", "CBU / CVU", true], ["alias", "Alias", true], ["cuit", "CUIT"]];

function PagoTransferencia({ datos, ultima }) {
  const toast = useToast();
  async function copiar(etiqueta, valor) {
    try {
      await navigator.clipboard.writeText(valor);
      toast.success(`${etiqueta} copiado`);
    } catch {
      toast.error("No se pudo copiar: seleccioná el texto y copialo a mano.");
    }
  }

  return (
    <section aria-labelledby="transferencia-titulo" className="space-y-4">
      <h3 id="transferencia-titulo" className="font-bold text-(--kt-ink)">Pagar por transferencia</h3>
      <dl className="divide-y divide-(--kt-border) rounded-2xl border border-(--kt-border)">
        {CAMPOS.map(([clave, etiqueta, copiable]) => (
          <div key={clave} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-(--kt-ink-soft)">{etiqueta}</dt>
              <dd className="break-all text-sm font-semibold text-(--kt-ink)">{datos[clave]}</dd>
            </div>
            {copiable && (
              <button type="button" onClick={() => copiar(etiqueta, datos[clave])} aria-label={`Copiar ${etiqueta}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-(--kt-teal-700) hover:bg-(--kt-bg-soft)">
                <Copy size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </dl>

      {ultima?.estado === "pendiente" ? (
        <p role="status" className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <Hourglass size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          Recibimos tu comprobante del {formatearMomento(ultima.creado_en)}. Lo estamos revisando: cuando lo confirmemos se suman los días a tu plan.
        </p>
      ) : (
        <>
          {ultima?.estado === "rechazado" && (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              No pudimos confirmar tu última transferencia: <strong>{ultima.motivo_rechazo}</strong>. Podés enviar otro comprobante.
            </p>
          )}
          <FormComprobante />
        </>
      )}
    </section>
  );
}

function FormComprobante() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(esquema), defaultValues: { nota: "" } });
  const enviar = useMutation({
    mutationFn: ({ comprobante, nota }) => avisarTransferencia({ comprobante: comprobante[0], nota }),
    onSuccess: async (r) => {
      toast.success(r.mensaje);
      reset();
      await queryClient.invalidateQueries({ queryKey: claveMiSuscripcion(usuario?.usuario_id) });
      await queryClient.invalidateQueries({ queryKey: ["suscripcion", "mis-pagos"] });
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((datos) => enviar.mutate(datos))} className="space-y-4 rounded-2xl bg-(--kt-bg-soft) p-4">
      <p className="text-sm text-(--kt-ink)">Cuando hayas transferido, subí el comprobante y lo confirmamos.</p>
      <div>
        <label htmlFor="comprobante" className="mb-1.5 block text-sm font-semibold text-(--kt-ink)">Comprobante (foto o PDF, hasta {MAX_MB} MB)</label>
        <input id="comprobante" type="file" accept={TIPOS.join(",")} aria-invalid={Boolean(errors.comprobante)} aria-describedby={errors.comprobante ? "comprobante-error" : undefined}
          {...register("comprobante")} disabled={enviar.isPending}
          className="block w-full rounded-xl border border-slate-300 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-(--kt-petrol) file:px-4 file:font-semibold file:text-white" />
        {errors.comprobante && <p id="comprobante-error" className="mt-1 text-sm text-red-700">{errors.comprobante.message}</p>}
      </div>
      <div>
        <label htmlFor="nota-transferencia" className="mb-1.5 block text-sm font-semibold text-(--kt-ink)">Nota (opcional)</label>
        <input id="nota-transferencia" type="text" maxLength={300} placeholder="Ej: transferí desde la cuenta de mi club" {...register("nota")} disabled={enviar.isPending}
          className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm" />
        {errors.nota && <p className="mt-1 text-sm text-red-700">{errors.nota.message}</p>}
      </div>
      {enviar.isError && <ErrorBanner message={mensajeDe(enviar.error, "No pudimos enviar el comprobante. Probá de nuevo.")} />}
      <button type="submit" disabled={enviar.isPending} className={`${BOTON} w-full bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover) sm:w-auto`}>
        <Upload size={18} aria-hidden="true" /> {enviar.isPending ? "Enviando…" : "Enviar comprobante"}
      </button>
    </form>
  );
}
