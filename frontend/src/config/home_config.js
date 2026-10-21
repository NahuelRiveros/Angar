/**
 * Contenido del Home — un objeto por cliente en `clientes`, mismo patrón que
 * `clientes`/`clienteActivo` de brand_config.js (de ahí se importa el switch,
 * para no tener dos interruptores de "qué cliente es este" desincronizados).
 * Para el próximo proyecto: sumar una entrada acá con la misma forma que
 * "gc", nunca sobreescribir la existente — así el cliente anterior queda
 * intacto y disponible si hace falta volver a él.
 *
 * Esta es la ÚNICA fuente de este contenido — ya NO se puede pisar desde la
 * base de datos. Antes `home_texto`/`home_pilar`/`home_contacto` tenían
 * prioridad si tenían filas, pero ese camino se eliminó: un seed viejo del
 * template original de gimnasio (seed_home.js, ver servidor/) las
 * repoblaba en cada reinicio del server sin gate de módulo, pisando en
 * silencio el contenido real de acá. home_page.jsx sigue teniendo un
 * fallback a esas tablas por compatibilidad, pero hoy están siempre vacías.
 *
 * hero_kicker, footer_cta_texto y footer_cta_titulo_resaltado no están acá
 * como strings fijos — leen de brandConfig (rubro/tagline/nombreCorto en
 * brand_config.js) para no duplicar el mismo dato de marca en dos archivos
 * de config. Cualquier texto que sea "el nombre de la empresa" debería
 * seguir este mismo patrón en vez de escribirse literal acá.
 */

import { Package, Truck, Clock, ShieldCheck } from "lucide-react";
import { clienteActivo, brandConfig } from "./brand_config.js";

const clientes = {
  gc: {
    textos: {
      hero_titulo: "Todo para abastecer",
      hero_titulo_resaltado: "tu negocio.",
      hero_subtitulo:
        "Explorá nuestros productos, encontrá ofertas y armá tu pedido mayorista o minorista en un solo lugar.",
      hero_cta_primario: "Ver catálogo",
      hero_cta_secundario: "Cómo pedir",
      // Sección "Quiénes somos" — el nombre de la empresa NO va acá adentro
      // (mismo criterio que el resto del archivo, ver comentario de arriba
      // de todo): home_page.jsx arma la oración completa intercalando
      // brandConfig.nombre, así que este texto tiene que poder leerse
      // seguido de "Somos {nombre}: ...".
      quienes_kicker: "Quiénes somos",
      quienes_titulo: "Una forma más simple de",
      quienes_titulo_resaltado: "comprar mayorista",
      quienes_texto:
        "manejamos pedidos mayoristas y minoristas desde un catálogo online siempre actualizado: elegís los productos, armás tu pedido y coordinamos la entrega directo con vos, sin trámites de más.",
      como_pedir_kicker: "Así es de simple",
      como_pedir_titulo: "De la góndola a tu puerta",
      pilares_kicker: "Por qué elegirnos",
      pilares_titulo: "Distribución mayorista y minorista,",
      pilares_titulo_resaltado: "sin vueltas",
      galeria_kicker: "Nuestro depósito",
      galeria_titulo: "Así trabajamos",
      contacto_kicker: "Hablemos",
      contacto_titulo: "Hacé tu pedido",
      footer_cta_titulo: "Pedí con",
      // Antes hardcodeado ("GC") — eso rompía la promesa de que renombrar la
      // marca alcanza con tocar brand_config.js. Ahora sale de ahí (forma
      // corta, ver nombreCorto) así este texto se actualiza solo.
      footer_cta_titulo_resaltado: brandConfig.nombreCorto,
    },

    // Chips de la sección "VALOR" — sin conexión a la base, siempre estos 4.
    // Redacción distinta a footer_config.js (enfoque/diferenciales) a
    // propósito — misma idea, la misma página no debería repetirse palabra
    // por palabra a sí misma más abajo.
    valor: [
      { icon: Package, label: "Catálogo completo" },
      { icon: Truck, label: "Entrega puntual" },
      { icon: Clock, label: "Stock al día" },
      { icon: ShieldCheck, label: "Pedidos sin sorpresas" },
    ],

    // "Cómo pedir" — 3 pasos, es una secuencia real (por eso la numeración).
    comoPedir: [
      { numero: "01", titulo: "Elegís del catálogo", texto: "Buscá por nombre o categoría, con precio y stock siempre al día." },
      { numero: "02", titulo: "Armás tu pedido", texto: "Sumá lo que necesites a tu pedido — podés dejarlo a medias y volver después." },
      { numero: "03", titulo: "Coordinamos la entrega", texto: "Confirmamos disponibilidad y te avisamos cuándo llega tu pedido." },
    ],

    // "Lo que nos diferencia" — mismo shape que HomePilar de la base
    // (id, icono [nombre de ICONOS_HOME], titulo, texto), para que
    // home_page.jsx los use igual sin importar de dónde vienen.
    pilares: [
      {
        id: "catalogo",
        icono: "Package",
        titulo: "Catálogo siempre actualizado",
        texto: "Productos organizados por categoría, con precios y stock al día para armar tu pedido sin sorpresas.",
      },
      {
        id: "entregas",
        icono: "Truck",
        titulo: "Entrega puntual",
        texto: "Coordinamos el despacho de cada pedido y te avisamos su estado — sin vueltas, sin esperas innecesarias.",
      },
      {
        id: "pagos",
        icono: "ShieldCheck",
        titulo: "Pagos flexibles",
        texto: "Podés dejar una seña y coordinar el resto del pago — no hace falta abonar todo por adelantado.",
      },
    ],

    // Mismo shape que HomeContacto de la base (id, icono, label, valor, href).
    // Los valores entre corchetes son placeholders reales — completar con los
    // datos del negocio (dirección, WhatsApp, etc.) antes de publicar.
    contactos: [
      { id: "ubicacion", icono: "MapPin", label: "Ubicación", valor: "[Tu dirección acá]", href: "#" },
      { id: "whatsapp", icono: "MessageCircle", label: "WhatsApp", valor: "[Tu número acá]", href: "#" },
      { id: "catalogo", icono: "Package", label: "Catálogo online", valor: "Mirá los productos y armá tu pedido", href: "/distribuidora/catalogo" },
    ],
  },

  // Cliente placeholder (ver brand_config.js: "NOMBRE INC" / "RUBRO FUTURO")
  // — completar esta entrada cuando este cliente se active de verdad, nunca
  // reusar/pisar la de "gc".
  moovs: {
    textos: {
      hero_titulo: brandConfig.nombre,
      hero_titulo_resaltado: brandConfig.tagline,
      hero_subtitulo: "Completá este texto en home_config.js antes de activar este cliente.",
      hero_cta_primario: "Conocé más",
      hero_cta_secundario: "Contacto",
      quienes_kicker: "Quiénes somos",
      quienes_titulo: "Título de quiénes somos,",
      quienes_titulo_resaltado: "a definir",
      quienes_texto: "Completá este texto en home_config.js antes de activar este cliente.",
      como_pedir_kicker: "Así es de simple",
      como_pedir_titulo: "Cómo funciona",
      pilares_kicker: "Por qué elegirnos",
      pilares_titulo: "Título de pilares,",
      pilares_titulo_resaltado: "a definir",
      galeria_kicker: "Galería",
      galeria_titulo: "Así trabajamos",
      contacto_kicker: "Hablemos",
      contacto_titulo: "Contactanos",
      footer_cta_titulo: "Sumate a",
      footer_cta_titulo_resaltado: "nosotros",
    },
    valor: [],
    comoPedir: [],
    pilares: [],
    contactos: [],
  },
};

const contenido = clientes[clienteActivo] ?? clientes.gc;

export const HOME_TEXTOS_DEFAULT = contenido.textos;
export const HOME_VALOR = contenido.valor;
export const HOME_COMO_PEDIR = contenido.comoPedir;
export const HOME_PILARES = contenido.pilares;
export const HOME_CONTACTOS = contenido.contactos;

export const HOME_TIENDA = {
  buscarPlaceholder: "Producto, marca o código",
  promoEtiqueta: "Ofertas destacadas",
  promoTitulo: "Oportunidades para tu próximo pedido.",
  promoTexto: "Descubrí los productos con precio especial y sumalos a tu compra.",
  promoCta: "Explorar ofertas",
  catalogoEtiqueta: "Nuestro catálogo",
  catalogoTitulo: "Todo en un solo pedido.",
  catalogoTexto: "Descubrí nuestros productos y encontrá lo que necesitás para tu negocio o tu casa.",
  catalogoCta: "Explorar productos",
  familiasEtiqueta: "Encontrá lo que necesitás",
  familiasTitulo: "Comprá por categoría",
  productosEtiqueta: "Seguí explorando",
  productosTitulo: "Productos para tu pedido",
};
