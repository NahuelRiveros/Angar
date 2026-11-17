import { z } from "zod";
import { PersonaFiscal } from "../../models/index.js";
import { fiscalConfig, normalizarDocumento, problemaFiscal } from "../../../../../core/fiscal_config.js";

const CAMPOS = ["condicion_iva", "cuit", "razon_social", "domicilio_fiscal"];
const opcional = (max) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().default(null));

/** USU-41: misma validación que la web (core/fiscal_config.js); el CUIT se guarda como 20-12345678-6. */
export const esquemaFiscal = z.object({
  condicion_iva: z.enum(fiscalConfig.condicionesIva.map((c) => c.value), { error: "Elegí tu condición frente al IVA." }),
  cuit: z.string({ error: "Ingresá tu CUIT." }).trim().max(20),
  razon_social: opcional(150),
  domicilio_fiscal: opcional(200),
}).superRefine((datos, ctx) => {
  const problema = problemaFiscal(datos);
  if (problema) ctx.addIssue({ code: "custom", path: ["cuit"], message: problema });
}).transform((datos) => ({ ...datos, cuit: normalizarDocumento(datos.cuit) }));

/** null si todavía no los cargó (USU-40: son opcionales hasta que hagan falta). */
export async function obtenerFiscal(persona_id) {
  return PersonaFiscal.findOne({ where: { persona_id }, attributes: CAMPOS });
}

export async function guardarFiscal(persona_id, datos) {
  const [fiscal] = await PersonaFiscal.upsert({ persona_id, ...datos, actualizado_en: new Date() }, { conflictFields: ["persona_id"] });
  return Object.fromEntries(CAMPOS.map((campo) => [campo, fiscal[campo]]));
}
