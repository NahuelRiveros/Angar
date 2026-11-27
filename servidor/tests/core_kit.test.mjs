import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// KIT-05: las pantallas del core usan el kit y los colores del tema, no los escriben a mano. Así un estilo
// (core/estilos.js) o la marca de un proyecto alcanzan a todas. Fichas: docs/specs/core/componentes.md y estilos.md.
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORE_WEB = path.join(raiz, "frontend/src/core");

const archivos = readdirSync(CORE_WEB, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && /\.(m?js|jsx)$/.test(e.name))
  .map((e) => {
    const ruta = path.join(e.parentPath, e.name);
    return { nombre: path.relative(CORE_WEB, ruta).split(path.sep).join("/"), texto: readFileSync(ruta, "utf8") };
  });

/** Lo que rompe cada regla, salvo en `donde` (el archivo del kit que lo define) y en los `heredados`. */
function buscar(patron, { donde = [], heredados = {} } = {}) {
  return archivos.filter((a) => !donde.includes(a.nombre) && !(a.nombre in heredados) && patron.test(a.texto)).map((a) => a.nombre);
}

test("KIT-05: ningún color escrito a mano en las clases (bg-[#…]): se usan las variables del tema", () => {
  assert.deepEqual(buscar(/-\[#[0-9a-fA-F]{3,8}\]/, { donde: ["controls/ui/estilos.js"] }), []);
});

test("KIT-05: tampoco en style={{…}}: si hace falta, con var(--kt-…)", () => {
  assert.deepEqual(buscar(/style=\{\{[^}]*(#[0-9a-fA-F]{3,8}\b|rgba?\()/), []);
});

test("KIT-05: las clases de botón y campo viven solo en el kit (controls/ui/estilos.js)", () => {
  // Pantallas de antes del kit que ya usan los proyectos: cambiarlas cambiaría cómo se ven.
  const heredados = {
    "controls/layout/panel/panel_layout.jsx": "botón cuadrado de ícono de la barra del panel",
    "modules/usuarios/admin/permisos_page.jsx": "botones de la pantalla de permisos",
  };
  assert.deepEqual(buscar(/const (BOTON|BTN|CAMPO)[A-Z_]* *=/, { donde: ["controls/ui/estilos.js"], heredados }), []);
});

test("KIT-05: los links de WhatsApp salen de linkWhatsapp y los precios de formatearPrecio", () => {
  assert.deepEqual(buscar(/wa\.me\//, { donde: ["utils/whatsapp.js"] }), []);
  assert.deepEqual(buscar(/style: *"currency"|minimumFractionDigits/, { donde: ["utils/dinero.js"] }), []);
});
