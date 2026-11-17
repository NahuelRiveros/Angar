import { LayoutDashboard } from "lucide-react";
import { modulosActivos } from "../../../proyecto/modulos_activos.js";
import { adminDropdown } from "./admin_dropdown.js";
import { superAdminDropdown } from "./super_admin_dropdown.js";

// Panel de gestión: todo lo que maneja el personal y el cliente nunca toca.
// Igual que main.js, este archivo solo ensambla: cada grupo reutiliza los ítems
// (con sus roles y `modulo`) del archivo dueño de ese menú, sin copiarlos. Los
// grupos de cada rubro vienen de su modulo.js.
const aplanar = (items) => items.flatMap((item) => item.children ?? [item]);

const gruposDeSecciones = [
  ...modulosActivos.flatMap((modulo) => modulo.menu?.panel ?? []),
  { id: "admin", titulo: "Gestión", items: aplanar(adminDropdown.items) },
  { id: "sistema", titulo: "Configuración", items: superAdminDropdown.items },
];

// Quien puede ver al menos una pantalla del panel puede entrar al panel: alcanza con
// uno de los roles (super admin) o de los permisos que piden sus ítems.
const unir = (campo) => [...new Set(gruposDeSecciones.flatMap((g) => g.items.flatMap((item) => item[campo] ?? [])))];
export const accesoPanel = { roles: unir("roles"), permisos: unir("permisos") };

export const panelInicio = { label: "Inicio", to: "/panel", exact: true, requiereAuth: true, ...accesoPanel, icon: LayoutDashboard };

export const panelGrupos = [{ id: "inicio", items: [panelInicio] }, ...gruposDeSecciones];

// Botón del navbar de la tienda que reemplaza a los menús del rubro, "Gestión" y "Configuración".
export const panelGestionLink = { label: "Panel de gestión", to: "/panel", requiereAuth: true, ...accesoPanel, icon: LayoutDashboard };
