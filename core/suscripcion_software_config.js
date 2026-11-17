import { clientConfig } from "../proyecto/client_config.js";

// SIS-56: una instalación puede no cobrarse el software (ej. un producto propio del dueño) con
// `suscripcionDelSoftware: false` en proyecto/client_config.js: sin bloqueo, sin rutas ni pantallas
// del plan. Sin ese dato queda prendida, como siempre.
export const suscripcionDelSoftwareActiva = clientConfig.suscripcionDelSoftware !== false;
