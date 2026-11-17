// Contenido fijo del inicio de la tienda. Las promociones (carrusel y cinta) no van acá: se cargan
// desde el panel, en "Banners y promociones", con fecha de inicio y fin. El nombre y la frase de
// la tienda salen de brand_config.js.

// Contactos del pie de página { id, icono, label, valor, href }. Íconos posibles en
// core/controls/config/home_iconos.js. Los que siguen con [COMPLETAR] no se muestran.
export const HOME_CONTACTOS = [
  { id: "ubicacion", icono: "MapPin", label: "Ubicación", valor: "[COMPLETAR dirección]", href: "#" },
  { id: "whatsapp", icono: "MessageCircle", label: "WhatsApp", valor: "[COMPLETAR número]", href: "#" },
];

// Textos que usa el rubro en su parte del inicio (ej. títulos de "Ofertas" o "Destacados").
export const HOME_TIENDA = {};
