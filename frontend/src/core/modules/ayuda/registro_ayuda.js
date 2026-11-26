import { modulosActivos } from "../../config/modulos_activos.js";
import { accesoPanel, panelGrupos } from "../../config/navbar_config/panel_gestion.js";
import { temasAyudaCore } from "./temas_core.js";
import { itemsPorPantalla } from "./ayuda_temas.js";

// Todos los temas de esta instalación: los del core y los que aporta cada rubro activo (modulo.js › ayuda).
export const todosLosTemas = [...temasAyudaCore, ...modulosActivos.flatMap((modulo) => modulo.ayuda ?? [])];

// Con qué se decide quién ve cada tema: los ítems del menú del panel y el acceso al panel (AYU-01, AYU-04).
export const contextoAyuda = { items: itemsPorPantalla(panelGrupos), accesoPanel };
