import test from "node:test";
import assert from "node:assert/strict";
import { enlaceValido, esquemaBanner, estadoBanner, hoyArgentina, TOPE_ACTIVOS } from "../src/core/services/sistema/banner_reglas.js";

const carrusel = { tipo: "carrusel", titulo: "Navidad", imagen_url: "https://res.cloudinary.com/demo/image/upload/navidad.jpg" };

test("SIS-34: el día se cuenta en hora de Argentina, no en UTC", () => {
  // 25/12 a las 23 h en Argentina ya es 26/12 en UTC.
  assert.equal(hoyArgentina(new Date("2026-12-26T02:00:00Z")), "2026-12-25");
  assert.equal(hoyArgentina(new Date("2026-12-26T03:00:00Z")), "2026-12-26");
});

test("SIS-34 y SIS-36: vigente entre desde y hasta, ambos días incluidos", () => {
  const navidad = { activo: true, vigente_desde: "2026-12-01", vigente_hasta: "2026-12-25" };
  assert.equal(estadoBanner(navidad, "2026-11-30"), "programado");
  assert.equal(estadoBanner(navidad, "2026-12-01"), "vigente");
  assert.equal(estadoBanner(navidad, "2026-12-25"), "vigente");
  assert.equal(estadoBanner(navidad, "2026-12-26"), "vencido");
  assert.equal(estadoBanner({ ...navidad, activo: false }, "2026-12-10"), "inactivo");
  assert.equal(estadoBanner({ activo: true, vigente_desde: null, vigente_hasta: null }, "2030-01-01"), "vigente");
});

test("SIS-35: solo enlaces a la tienda o https", () => {
  assert.ok(enlaceValido("/ofertas?categoria=navidad"));
  assert.ok(enlaceValido("https://wa.me/5493510000000"));
  assert.equal(enlaceValido("//sitio-ajeno.com"), false);
  assert.equal(enlaceValido("javascript:alert(1)"), false);
  assert.equal(enlaceValido("http://sin-https.com"), false);
});

test("SIS-32: un banner de carrusel necesita imagen; la cinta no", () => {
  const sinImagen = esquemaBanner.safeParse({ tipo: "carrusel", titulo: "Promo" });
  assert.equal(sinImagen.success, false);
  assert.equal(sinImagen.error.issues[0].message, "Un banner de carrusel necesita una imagen.");
  assert.equal(esquemaBanner.safeParse({ tipo: "cinta", titulo: "Envío gratis desde $50.000" }).success, true);
});

test("SIS-34: 'hasta' no puede ser anterior a 'desde' y la fecha tiene que existir", () => {
  const alReves = esquemaBanner.safeParse({ ...carrusel, vigente_desde: "2026-12-25", vigente_hasta: "2026-12-01" });
  assert.equal(alReves.error.issues[0].path[0], "vigente_hasta");
  assert.equal(esquemaBanner.safeParse({ ...carrusel, vigente_desde: "2026-02-30" }).success, false);
});

test("SIS-32: los campos vacíos del formulario se guardan como null y activo por defecto", () => {
  const { data } = esquemaBanner.safeParse({ ...carrusel, enlace: "", vigente_desde: "", imagen_celular_url: "" });
  assert.equal(data.enlace, null);
  assert.equal(data.vigente_desde, null);
  assert.equal(data.imagen_celular_url, null);
  assert.equal(data.activo, true);
});

test("SIS-39: tope de 8 de carrusel y 4 de cinta", () => {
  assert.deepEqual(TOPE_ACTIVOS, { carrusel: 8, cinta: 4 });
});
