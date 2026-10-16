import { LayoutDashboard } from "lucide-react";
import { projectModules } from "../gate_config.js";
import { eccomerceDistribuidoraAdminDropdown } from "./eccomerce_distribuidora_dropdown.js";
import { adminDropdown } from "./admin_dropdown.js";
import { superAdminDropdown } from "./super_admin_dropdown.js";

// Panel de gestión: todo lo que maneja el personal y el cliente nunca toca.
// Igual que main.js, este archivo solo ensambla: cada grupo reutiliza los ítems
// (con sus roles y `modulo`) del archivo dueño de ese menú, sin copiarlos.
const aplanar = (items) => items.flatMap((item) => item.children ?? [item]);

const gruposDeSecciones = [
  ...(projectModules.eccomerce_distribuidora ? [{ id: "distribuidora", titulo: "Distribuidora", items: eccomerceDistribuidoraAdminDropdown.items }] : []),
  { id: "admin", titulo: "Admin", items: aplanar(adminDropdown.items) },
  { id: "sistema", titulo: "Sistema", items: superAdminDropdown.items },
];

// Quien puede ver al menos una pantalla del panel puede entrar al panel.
export const rolesPanel = [...new Set(gruposDeSecciones.flatMap((g) => g.items.flatMap((item) => item.roles ?? [])))];

export const panelInicio = { label: "Inicio", to: "/panel", exact: true, requiereAuth: true, roles: rolesPanel, icon: LayoutDashboard };

export const panelGrupos = [{ id: "inicio", items: [panelInicio] }, ...gruposDeSecciones];

// Botón del navbar de la tienda que reemplaza a los menús "Distribuidora · Gestión", "Admin" y "Sistema".
export const panelGestionLink = { label: "Panel de gestión", to: "/panel", requiereAuth: true, roles: rolesPanel, icon: LayoutDashboard };
