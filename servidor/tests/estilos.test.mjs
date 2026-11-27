import test from "node:test";
import assert from "node:assert/strict";

// Estilos de diseño (EST). Spec: docs/specs/core/estilos.md.
const { ESTILOS, VARIABLES_DE_ESTILO } = await import("../../core/estilos.js");

/** Contraste WCAG 2 entre dos colores #rrggbb. */
function contraste(a, b) {
  const luz = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, oscuro] = [luz(a), luz(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

test("EST-01: los tres estilos existen y definen las mismas variables", () => {
  assert.deepEqual(Object.keys(ESTILOS), ["minimalista", "moderno", "clasico"]);
  for (const [codigo, estilo] of Object.entries(ESTILOS)) {
    assert.deepEqual(Object.keys(estilo.variables).sort(), [...VARIABLES_DE_ESTILO].sort(), codigo);
    assert.ok(estilo.nombre && estilo.descripcion, codigo);
    for (const familia of [estilo.fuentes.display, estilo.fuentes.body]) {
      const nombre = familia.match(/'([^']+)'/)[1];
      assert.ok(estilo.google.includes(`family=${nombre.replaceAll(" ", "+")}`), `${codigo}: ${nombre} se carga de Google Fonts`);
    }
  }
});

test("EST-02: cada estilo se lee bien (contraste WCAG AA, 4,5:1; texto principal, 7:1)", () => {
  for (const [codigo, { variables: v }] of Object.entries(ESTILOS)) {
    const pares = [
      ["blanco sobre botón principal", "#ffffff", v["--kt-teal-700"], 4.5],
      ["blanco sobre botón principal al pasar", "#ffffff", v["--kt-petrol"], 4.5],
      ["blanco sobre botón de compra", "#ffffff", v["--kt-accent-comercial"], 4.5],
      ["blanco sobre botón de compra al pasar", "#ffffff", v["--kt-accent-comercial-hover"], 4.5],
      ["texto sobre fondo", v["--kt-ink"], v["--kt-bg"], 7],
      ["texto secundario sobre fondo", v["--kt-ink-soft"], v["--kt-bg"], 4.5],
      ["texto secundario sobre fondo suave", v["--kt-ink-soft"], v["--kt-bg-soft"], 4.5],
      ["gris 500 (texto chico) sobre blanco", v["--color-neutral-500"], "#ffffff", 4.5],
      ["gris 600 sobre gris 50", v["--color-neutral-600"], v["--color-neutral-50"], 4.5],
    ];
    for (const [que, a, b, minimo] of pares) {
      const c = contraste(a, b);
      assert.ok(c >= minimo, `${codigo}: ${que} da ${c.toFixed(2)}:1 (mínimo ${minimo}:1)`);
    }
  }
});
