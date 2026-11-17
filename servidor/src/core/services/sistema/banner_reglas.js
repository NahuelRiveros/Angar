import { z } from "zod";

// Reglas de los banners sin acceso a la base, para poder probarlas solas (tests/core_banners.test.mjs).

export const TIPOS_BANNER = ["carrusel", "cinta"];
// SIS-39: más que esto nadie los llega a ver.
export const TOPE_ACTIVOS = { carrusel: 8, cinta: 4 };

/** "2026-12-25" en hora de Argentina: "hasta el 25" incluye todo ese día, no corta a las 21 h por UTC. */
export function hoyArgentina(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(ahora);
}

/** SIS-34 y SIS-36. Las fechas DATEONLY llegan como "AAAA-MM-DD" y se comparan como texto. */
export function estadoBanner({ activo, vigente_desde, vigente_hasta }, hoy = hoyArgentina()) {
  if (!activo) return "inactivo";
  if (vigente_desde && vigente_desde > hoy) return "programado";
  if (vigente_hasta && vigente_hasta < hoy) return "vencido";
  return "vigente";
}

/** SIS-35: solo páginas de la tienda ("/ofertas", no "//otro-sitio") o sitios seguros. */
export const enlaceValido = (valor) => /^\/(?!\/)/.test(valor) || /^https:\/\/[^\s]+$/.test(valor);

// Un campo vacío del formulario llega como "": se guarda como null.
const opcional = (esquema) => z.preprocess((v) => (v === "" || v === undefined ? null : v), esquema.nullable());
// Además del formato, que exista: "2026-02-30" no es una fecha.
const fecha = z.string().refine(
  (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v),
  "Usá una fecha válida (AAAA-MM-DD).",
);
const imagen = z.string().trim().max(500).regex(/^https:\/\//, "La imagen tiene que ser una dirección https.");

export const esquemaBanner = z.object({
  tipo: z.enum(TIPOS_BANNER, { error: "Elegí si es de carrusel o de cinta." }),
  titulo: z.string({ error: "Escribí el texto del banner." }).trim().min(1, "Escribí el texto del banner.").max(200, "Máximo 200 caracteres."),
  imagen_url: opcional(imagen),
  imagen_celular_url: opcional(imagen),
  enlace: opcional(z.string().trim().max(500).refine(enlaceValido, "El enlace tiene que empezar con / (una página de la tienda) o con https://.")),
  orden: z.coerce.number().int().min(0).max(999).default(0),
  activo: z.boolean().default(true),
  vigente_desde: opcional(fecha),
  vigente_hasta: opcional(fecha),
}).superRefine((banner, ctx) => {
  if (banner.tipo === "carrusel" && !banner.imagen_url) {
    ctx.addIssue({ code: "custom", path: ["imagen_url"], message: "Un banner de carrusel necesita una imagen." });
  }
  if (banner.vigente_desde && banner.vigente_hasta && banner.vigente_hasta < banner.vigente_desde) {
    ctx.addIssue({ code: "custom", path: ["vigente_hasta"], message: "La fecha \"hasta\" no puede ser anterior a \"desde\"." });
  }
});

export const esquemaEstado = z.object({ activo: z.boolean({ error: "Indicá si queda activo o no." }) });
export const esquemaId = z.object({ id: z.coerce.number().int().positive("Banner no válido.") });
