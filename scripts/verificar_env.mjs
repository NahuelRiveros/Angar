// Revisa servidor/.env y frontend/.env contra sus .env.example SIN mostrar ningún valor:
// solo nombres y si están completos. Uso: npm --prefix servidor run env:verificar
//
//   ✅ bien   ⚠️ nombre anterior (renombrar)   ❔ no figura en el .env.example   ❌ falta o hay que corregirla
//
// Opcional: una carpeta raíz distinta como argumento (la usan los tests con archivos falsos).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), "..");

// Nombre anterior → nombre actual.
const ANTERIORES = {
  NEON_DATABASE_URL: "BD_URL",
  NEON_DATABASE_URL_MIGRACION: "BD_URL",
};

// Restos de los .env.example que no pueden llegar a un entorno real.
const VALORES_DE_EJEMPLO = ["[COMPLETAR]", "TU_PASSWORD_AQUI", "CAMBIA_ESTE_VALOR"];

/** { NOMBRE: valor } de un archivo .env (el valor nunca se imprime). */
function leerEnv(ruta) {
  const variables = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!m) continue;
    const valor = m[2].trim();
    variables[m[1]] = /^["']/.test(valor) ? valor.replace(/^(["'])(.*)\1.*$/, "$2") : valor.replace(/\s+#.*$/, "");
  }
  return variables;
}

function revisar({ nombre, archivo, ejemplo, obligatorias }) {
  const ruta = join(RAIZ, archivo);
  console.log(`\n── ${nombre} (${archivo}) ──`);
  if (!existsSync(ruta)) {
    console.log(`❌ No existe. Copiá ${ejemplo} como ${archivo} y completalo.`);
    return 1;
  }
  const esperadas = Object.keys(leerEnv(join(RAIZ, ejemplo)));
  const actuales = leerEnv(ruta);
  let problemas = 0;

  for (const [clave, valor] of Object.entries(actuales)) {
    if (VALORES_DE_EJEMPLO.some((ej) => valor.includes(ej))) {
      console.log(`❌ ${clave} → todavía tiene un valor de ejemplo`);
      problemas++;
    } else if (ANTERIORES[clave]) {
      console.log(`⚠️  ${clave} → renombrar a ${ANTERIORES[clave]} (con el nombre viejo no se lee)`);
      problemas++;
    } else if (esperadas.includes(clave)) {
      console.log(`✅ ${clave}${valor ? "" : " (vacía)"}`);
    } else {
      console.log(`❔ ${clave} → no figura en ${ejemplo} (revisá si se usa)`);
    }
  }
  for (const { mensaje, cumple } of obligatorias) {
    if (!cumple(actuales)) {
      console.log(`❌ ${mensaje}`);
      problemas++;
    }
  }
  return problemas;
}

const problemas =
  revisar({
    nombre: "Servidor",
    archivo: "servidor/.env",
    ejemplo: "servidor/.env.example",
    obligatorias: [
      {
        mensaje: "Falta la base de datos: BD_URL (Supabase) o DB_NAME (Postgres local)",
        cumple: (v) => Boolean(v.BD_URL || v.DB_NAME),
      },
      {
        mensaje: "BD_URL tiene que ser la dirección completa (postgresql://usuario:contraseña@host:5432/postgres), no solo el host",
        cumple: (v) => !v.BD_URL || /^postgres(ql)?:\/\/[^@\s]+@[^\s]+$/.test(v.BD_URL),
      },
      {
        mensaje: "DB_SCHEMA inválido: solo minúsculas, números y _ (ej. gc_dist_test)",
        cumple: (v) => !v.DB_SCHEMA || /^[a-z][a-z0-9_]*$/.test(v.DB_SCHEMA),
      },
      {
        mensaje: "Con BD_URL (Supabase) hace falta DB_SSL=true",
        cumple: (v) => !v.BD_URL || v.DB_SSL?.toLowerCase() === "true",
      },
    ],
  }) +
  revisar({
    nombre: "Frontend",
    archivo: "frontend/.env",
    ejemplo: "frontend/.env.example",
    obligatorias: [
      { mensaje: "Falta VITE_API_URL (en tu PC: http://localhost:3001/api)", cumple: (v) => Boolean(v.VITE_API_URL) },
    ],
  });

console.log(problemas ? `\n${problemas} cosa(s) para corregir.` : "\n✅ Todo en orden.");
process.exit(problemas ? 1 : 0);
