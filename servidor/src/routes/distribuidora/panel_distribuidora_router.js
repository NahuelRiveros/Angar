import { Router } from "express";
import { resumenPanelController } from "../../controllers/distribuidora/panel_distribuidora_controller.js";
import { CODIGOS_PERMISO } from "../../../../permisos_config.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

export const panelDistribuidoraRouter = Router();
panelDistribuidoraRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
panelDistribuidoraRouter.use(requireAuth);

// Entra quien tenga algún permiso del personal; cada sección se filtra además por permiso en el servicio.
panelDistribuidoraRouter.get("/resumen", requirePermiso(...CODIGOS_PERMISO), resumenPanelController);
