import { Trophy, Smartphone } from "lucide-react";
import { brandConfig } from "./brand_config.js";

// Contenido del footer. `habilitado: false` apaga un ítem puntual.
export const footer_config = {
  marca: {
    tagline: brandConfig.tagline,
    estadoLabel: "Sistema activo",
    selloLabel: "Torneos de pádel",
  },
  diferenciales: [
    { habilitado: true, icon: Trophy, titulo: "Torneos prolijos", texto: "Zonas, llaves y resultados siempre al día." },
    { habilitado: true, icon: Smartphone, titulo: "Pensado para el celular", texto: "Organizadores y jugadores lo usan desde cualquier lado." },
  ],
  callout: null,
  legal: {
    nombreDerechos: brandConfig.nombre,
    mostrarDesarrolladoPor: true,
    desarrolladoPor: "Riveros Edgardo Nahuel",
  },
};
