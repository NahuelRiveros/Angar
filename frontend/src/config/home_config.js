/**
 * Contenido del Home. Es la única fuente de estos textos: las tablas home_texto,
 * home_pilar y home_contacto quedan vacías (home_page.jsx las usa solo si tuvieran filas).
 * Los valores entre corchetes son placeholders: completarlos antes de publicar.
 */
import { brandConfig } from "./brand_config.js";

export const HOME_TEXTOS_DEFAULT = {
  hero_kicker: brandConfig.rubro,
  hero_titulo: "Tu torneo de pádel,",
  hero_titulo_resaltado: "organizado en serio.",
  hero_subtitulo: "Inscripciones, zonas, llaves, partidos, reglas y premios en un solo lugar. Los jugadores siguen todo desde el celular.",
  hero_cta_primario: "Crear cuenta",
  hero_cta_secundario: "Cómo funciona",
  // home_page.jsx arma la oración "Somos {nombre}: ..." con este texto.
  quienes_kicker: "Qué es",
  quienes_titulo: "Menos planillas,",
  quienes_titulo_resaltado: "más pádel",
  quienes_texto: "una plataforma para que clubes y organizadores armen sus torneos sin perder tiempo en planillas, grupos de WhatsApp y cuadros a mano.",
  como_funciona_kicker: "Así es de simple",
  como_funciona_titulo: "Del anuncio a la final",
  pilares_kicker: "Todo lo que incluye",
  pilares_titulo: "Lo que necesita un torneo,",
  pilares_titulo_resaltado: "sin vueltas",
  galeria_kicker: "Torneos",
  galeria_titulo: "Así se juega",
  contacto_kicker: "Hablemos",
  contacto_titulo: "Contacto",
  footer_cta_titulo: "Organizá con",
  footer_cta_titulo_resaltado: brandConfig.nombreCorto,
};

// Secuencia real (por eso la numeración).
export const HOME_COMO_FUNCIONA = [
  { numero: "01", titulo: "Creás el torneo", texto: "Fechas, sede, categorías, reglas y premios." },
  { numero: "02", titulo: "Se anotan las parejas", texto: "Armás las zonas y el sistema calcula las posiciones." },
  { numero: "03", titulo: "Se juegan las llaves", texto: "Cargás los resultados y el cuadro avanza solo hasta la final." },
];

// Mismo shape que HomePilar de la base (id, icono [nombre de ICONOS_HOME], titulo, texto).
export const HOME_PILARES = [
  { id: "zonas", icono: "Users", titulo: "Zonas y posiciones", texto: "Grupos todos contra todos con la tabla calculada al cargar cada resultado." },
  { id: "llaves", icono: "Trophy", titulo: "Llaves automáticas", texto: "El cuadro eliminatorio se arma con los clasificados de cada zona." },
  { id: "premios", icono: "Award", titulo: "Reglas y premios", texto: "Publicá el reglamento y los premios de cada categoría para que todos los vean." },
];

// Mismo shape que HomeContacto de la base (id, icono, label, valor, href).
export const HOME_CONTACTOS = [
  { id: "whatsapp", icono: "MessageCircle", label: "WhatsApp", valor: "[Tu número acá]", href: "#" },
  { id: "email", icono: "Mail", label: "Email", valor: "[Tu email acá]", href: "#" },
];
