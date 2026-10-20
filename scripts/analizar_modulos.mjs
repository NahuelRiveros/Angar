// Lee gate_config.js (el gate maestro, en la raíz del repo — frontend y
// servidor re-exportan este mismo archivo) y, para cada módulo, reporta qué
// carpetas de frontend y backend le pertenecen y si están activas o no en
// este proyecto — sin borrar ni tocar nada.
//
// Uso: node scripts/analizar_modulos.mjs
//
// Pensado para el momento de armar una copia de este template para un
// cliente nuevo (repo "initProyectos" o el que sea): correlo, mirá qué
// módulos quedaron en `false`, y las carpetas que lista bajo "INACTIVO"
// son las candidatas a borrar en ESA copia — nunca en este repo, que es
// la plantilla base y debe conservar todos los módulos.
//
// Si se agrega un módulo nuevo (nueva vertical), sumarlo a MODULOS acá
// abajo con sus carpetas — el resto del script no necesita cambios.
//
// Las tablas de un módulo en `false` ya NO se crean en el deploy (ver
// servidor/src/database/bootstrap.js, que lee este mismo gate_config.js) —
// este script sigue sirviendo para lo que las tablas no resuelven solas:
// saber qué carpetas de código borrar en una copia de cliente.

import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, "..");
const frontendSrc = path.join(raiz, "frontend", "src");
const servidorSrc = path.join(raiz, "servidor", "src");

const { projectModules } = await import(
  pathToFileURL(path.join(raiz, "gate_config.js")).href
);

// codigo (igual a la key de projectModules / a requireModuloHabilitado en el backend) → carpetas
const MODULOS = {
  eccomerce_indumentaria: {
    frontend: [
      "modules/eccomerce_indumentaria",
      "config/navbar_config/eccomerce_indumentaria_dropdown.js",
      "config/catalog_config.js",
      "config/cart_config.js",
      "controls/carrito",
    ],
    backendModels: ["models/productos", "models/carrito"],
    backendCapas: [
      "services/productos", "controllers/productos", "routes/productos",
      "services/carrito", "controllers/carrito", "routes/carrito",
    ],
  },
  eccomerce_distribuidora: {
    frontend: ["modules/eccomerce_distribuidora", "config/navbar_config/eccomerce_distribuidora_dropdown.js"],
    backendModels: ["models/distribuidora"],
    backendCapas: ["services/distribuidora", "controllers/distribuidora", "routes/distribuidora"],
  },
  stock: {
    frontend: [], // sin UI todavía — ver comentario en gate_config.js
    backendModels: ["models/kiosco"],
    backendCapas: ["services/stock", "controllers/stock", "routes/stock"],
  },
};

// Carpetas transversales — nunca se listan como "para borrar", están acá
// solo como referencia de qué NO depende de ningún módulo.
const SIEMPRE_ACTIVO = {
  frontend: [
    "modules/home", "modules/usuarios", "controls", "app",
    "config/brand_config.js", "config/footer_config.js", "config/home_config.js",
    "config/gate_config.js", "config/navbar_config/main.js",
    "config/navbar_config/admin_dropdown.js", "config/navbar_config/super_admin_dropdown.js",
  ],
  backend: [
    "models/common", "models/home", "models/persona", "models/sistema", "models/usuario",
    "services/common", "services/home", "services/sistema", "services/usuarios",
    "controllers/common", "controllers/home", "controllers/sistema", "controllers/usuarios",
    "routes/home", "routes/sistema", "routes/usuarios",
  ],
};

function contarArchivos(rutaAbs) {
  if (!existsSync(rutaAbs)) return null;
  const stat = statSync(rutaAbs);
  if (stat.isFile()) return 1;
  let total = 0;
  for (const entry of readdirSync(rutaAbs, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) total++;
  }
  return total;
}

function listar(rutasRelativas, base) {
  return rutasRelativas.map((rel) => {
    const abs = path.join(base, rel);
    const n = contarArchivos(abs);
    return { rel, existe: n !== null, archivos: n ?? 0 };
  });
}

console.log("=== Gate maestro (gate_config.js, raíz del repo) ===\n");

for (const [codigo, activo] of Object.entries(projectModules)) {
  const cfg = MODULOS[codigo];
  const estado = activo ? "ACTIVO" : "INACTIVO";
  console.log(`[${estado}] ${codigo}`);

  if (!cfg) {
    console.log("    (sin mapeo de carpetas en este script — agregalo a MODULOS si corresponde)\n");
    continue;
  }

  const frontendItems = listar(cfg.frontend, frontendSrc);
  const backendItems = listar([...cfg.backendModels, ...cfg.backendCapas], servidorSrc);

  for (const it of [...frontendItems, ...backendItems]) {
    if (!it.existe) continue;
    console.log(`    ${it.rel}  (${it.archivos} archivo${it.archivos === 1 ? "" : "s"})`);
  }
  if (!activo) {
    console.log("    -> candidatas a borrar en una copia de cliente que no use este módulo.");
  }
  console.log("");
}

console.log("=== Siempre activo (no depende de ningún módulo, no tocar) ===\n");
for (const it of [
  ...listar(SIEMPRE_ACTIVO.frontend, frontendSrc),
  ...listar(SIEMPRE_ACTIVO.backend, servidorSrc),
]) {
  if (it.existe) console.log(`    ${it.rel}`);
}
