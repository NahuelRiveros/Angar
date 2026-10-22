import { ClipboardList, UserCircle } from "lucide-react";
import { projectModules } from "../gate_config.js";
export const accountLinks = [
  ...(projectModules.eccomerce_distribuidora ? [
    { label: "Mis pedidos", to: "/distribuidora/mis-pedidos", requiereAuth: true, modulo: "eccomerce_distribuidora", icon: ClipboardList },
    { label: "Mis datos", to: "/perfil", requiereAuth: true, modulo: "eccomerce_distribuidora", icon: UserCircle },
  ] : []),
];
