import { modulosActivos } from "../../../proyecto/modulos_activos.js";

// Links de "Mi cuenta": los aporta cada módulo de rubro (ver su modulo.js).
export const accountLinks = modulosActivos.flatMap((modulo) => modulo.menu?.cuenta ?? []);
