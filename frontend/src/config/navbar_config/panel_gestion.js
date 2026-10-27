import { LayoutDashboard } from "lucide-react";
import { adminDropdown } from "./admin_dropdown.js";

// Panel de gestión de la plataforma. Igual que main.js, este archivo solo ensambla:
// cada grupo reutiliza los ítems (con sus roles y permisos) del archivo dueño de ese menú.
const aplanar = (items) => items.flatMap((item) => item.children ?? [item]);

const gruposDeSecciones = [
  { id: "admin", titulo: "Admin", items: aplanar(adminDropdown.items) },
];

// Quien puede ver al menos una pantalla del panel puede entrar al panel: alcanza con
// uno de los roles (super admin) o de los permisos que piden sus ítems.
const unir = (campo) => [...new Set(gruposDeSecciones.flatMap((g) => g.items.flatMap((item) => item[campo] ?? [])))];
export const accesoPanel = { roles: unir("roles"), permisos: unir("permisos") };

export const panelInicio = { label: "Inicio", to: "/panel", exact: true, requiereAuth: true, ...accesoPanel, icon: LayoutDashboard };

export const panelGrupos = [{ id: "inicio", items: [panelInicio] }, ...gruposDeSecciones];

// Botón del navbar del sitio que lleva al panel.
export const panelGestionLink = { label: "Panel de gestión", to: "/panel", requiereAuth: true, ...accesoPanel, icon: LayoutDashboard };
