import { Router } from "express";
import { resumenPanelController } from "../../controllers/distribuidora/panel_distribuidora_controller.js";
import { ROLES_PANEL } from "../../services/distribuidora/panel_distribuidora_service.js";
import { requireAuth, requireRole } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

export const panelDistribuidoraRouter = Router();
panelDistribuidoraRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
panelDistribuidoraRouter.use(requireAuth);

// Un cliente nunca llega acá; cada sección del resumen se filtra además por rol en el servicio.
panelDistribuidoraRouter.get("/resumen", requireRole(...ROLES_PANEL), resumenPanelController);
