import { fiscalConfig } from "../../../../../fiscal_config.js";

// Misma lista que valida el servidor (fiscal_config.js).
export const OPCIONES_CONDICION_IVA = fiscalConfig.condicionesIva.map(({ value, label }) => ({ value, label }));
