import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolverApiUrl } from "../../frontend/src/api/api_url.js";

// Sin base: BD_URL vacía y ninguna prueba pide /health?bd=1.
process.env.NODE_ENV = "test";
process.env.BD_URL = "";
process.env.CORS_ORIGIN = ` "https://tienda.vercel.app/" , http://localhost:5173 `;
const { createApp, parsearOrigenes } = await import("../src/app.js");
const { limpiarValor } = await import("../src/configuracion_servidor/env.js");

async function conServidor(probar) {
  const servidor = createApp().listen(0);
  await new Promise((r) => servidor.once("listening", r));
  try {
    await probar(`http://127.0.0.1:${servidor.address().port}`);
  } finally {
    await new Promise((r) => servidor.close(r));
  }
}

test("variables pegadas con comillas o espacios en Render se limpian", () => {
  assert.equal(limpiarValor(`  "https://api.onrender.com"  `), "https://api.onrender.com");
  assert.equal(limpiarValor("'mipadel'"), "mipadel");
  assert.equal(limpiarValor(`"sin cerrar`), `"sin cerrar`);
  assert.deepEqual(parsearOrigenes(` "https://a.vercel.app/" ,, https://b.com `), ["https://a.vercel.app", "https://b.com"]);
  assert.deepEqual(parsearOrigenes(undefined), []);
});

test("la API de producción usa MiPadel y rechaza direcciones mal formadas antes de enviar credenciales", () => {
  assert.equal(resolverApiUrl(undefined), "https://mipadel.onrender.com/api");
  assert.equal(resolverApiUrl(""), "https://mipadel.onrender.com/api");
  assert.equal(resolverApiUrl(undefined, true), "http://localhost:3001/api");
  assert.equal(resolverApiUrl(' "https://mipadel.onrender.com/api/" '), "https://mipadel.onrender.com/api");
  assert.equal(resolverApiUrl("https://otra-api.example.com/api"), "https://otra-api.example.com/api");
  for (const invalida of ["/api", "https://api.example.com", "https://api.example.com/api?clave=1", "https://usuario:clave@api.example.com/api"]) {
    assert.throws(() => resolverApiUrl(invalida), /VITE_API_URL/);
  }
});

test("/api/health responde sin tocar la base", async () => {
  await conServidor(async (url) => {
    const r = await fetch(`${url}/api/health`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cache-control"), "no-store");
    const cuerpo = await r.json();
    assert.equal(cuerpo.ok, true);
    assert.equal(cuerpo.base_de_datos, "sin_revisar");
  });
});

test("CORS acepta la tienda configurada aunque tenga / final y rechaza otros con 403", async () => {
  await conServidor(async (url) => {
    const permitido = await fetch(`${url}/api/health`, { headers: { Origin: "https://tienda.vercel.app" } });
    assert.equal(permitido.headers.get("access-control-allow-origin"), "https://tienda.vercel.app");

    const preflight = await fetch(`${url}/api/auth/google`, {
      method: "OPTIONS",
      headers: { Origin: "https://tienda.vercel.app", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization" },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "https://tienda.vercel.app");
    assert.match(preflight.headers.get("access-control-allow-methods"), /POST/);
    assert.match(preflight.headers.get("access-control-allow-headers"), /content-type,authorization/);
    assert.equal(preflight.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");

    const rechazado = await fetch(`${url}/api/health`, { headers: { Origin: "https://otro-sitio.com" } });
    assert.equal(rechazado.status, 403);
    assert.equal((await rechazado.json()).codigo, "CORS_NO_PERMITIDO");
    const rechazadoPreflight = await fetch(`${url}/api/auth/google`, { method: "OPTIONS", headers: { Origin: "https://otro-sitio.com", "Access-Control-Request-Method": "POST" } });
    assert.equal(rechazadoPreflight.status, 403);
    assert.equal(rechazadoPreflight.headers.get("access-control-allow-origin"), null);
  });
});

test("producción permite el frontend de MiPadel por defecto y muestra la identidad correcta", () => {
  const appJs = new URL("../src/app.js", import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    const { createApp } = await import(${JSON.stringify(appJs)});
    const servidor = createApp().listen(0);
    await new Promise(r => servidor.once('listening', r));
    try {
      const base = 'http://127.0.0.1:' + servidor.address().port;
      const r = await fetch(base + '/api/auth/google', { method: 'OPTIONS', headers: {
        Origin: 'https://mipadel.vercel.app', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'
      }});
      assert.equal(r.status, 204);
      assert.equal(r.headers.get('access-control-allow-origin'), 'https://mipadel.vercel.app');
      const portada = await (await fetch(base + '/')).json();
      assert.equal(portada.nombre, 'MiPadel API');
      assert.equal(portada.frontend, 'https://mipadel.vercel.app');
    } finally { await new Promise(r => servidor.close(r)); }
  `;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", BD_URL: "", CORS_ORIGIN: "", VERCEL_FRONTEND_URL: "", JWT_SECRET: "prueba-local", CLOUDINARY_CLOUD_NAME: "prueba", CLOUDINARY_API_KEY: "prueba", CLOUDINARY_API_SECRET: "prueba" },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("BD_URL con solo el host frena el arranque con un mensaje claro y sin mostrar el valor", () => {
  const sequelizeJs = new URL("../src/database/sequelize.js", import.meta.url).href;
  const arrancar = (BD_URL) =>
    spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(sequelizeJs)})`], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test", BD_URL },
    });

  const soloHost = arrancar("db.EJEMPLO_SECRETO.supabase.co");
  assert.notEqual(soloHost.status, 0);
  assert.match(soloHost.stderr, /BD_URL tiene que ser la dirección COMPLETA/);
  assert.doesNotMatch(soloHost.stderr, /EJEMPLO_SECRETO/);

  assert.equal(arrancar("postgresql://postgres.ej:clave@aws-0-ej.pooler.supabase.com:5432/postgres").status, 0);
});

test("verificar_env avisa nombres viejos y valores de ejemplo sin mostrar valores", () => {
  const raiz = mkdtempSync(join(tmpdir(), "verificar_env_"));
  try {
    mkdirSync(join(raiz, "servidor"));
    mkdirSync(join(raiz, "frontend"));
    writeFileSync(join(raiz, "servidor/.env.example"), "BD_URL=\nDB_SSL=true\nDB_SCHEMA=mipadel_test\n");
    writeFileSync(join(raiz, "frontend/.env.example"), "VITE_API_URL=http://localhost:3001/api\n");
    writeFileSync(join(raiz, "servidor/.env"), "NEON_DATABASE_URL=postgres://SECRETO_NO_MOSTRAR\nBD_URL=postgresql://u:[COMPLETAR]@host/db\nDB_SSL=true\n");
    writeFileSync(join(raiz, "frontend/.env"), "VITE_API_URL=https://api.onrender.com/api\n");

    const script = fileURLToPath(new URL("../../scripts/verificar_env.mjs", import.meta.url));
    const r = spawnSync(process.execPath, [script, raiz], { encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /NEON_DATABASE_URL → renombrar a BD_URL/);
    assert.match(r.stdout, /BD_URL → todavía tiene un valor de ejemplo/);
    assert.match(r.stdout, /✅ VITE_API_URL/);
    assert.doesNotMatch(r.stdout, /SECRETO_NO_MOSTRAR|onrender\.com/);

    writeFileSync(join(raiz, "servidor/.env"), "BD_URL=postgresql://u:clave@host/db\nDB_SSL=true\nDB_SCHEMA=mipadel_test\n");
    const ok = spawnSync(process.execPath, [script, raiz], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stdout);
    assert.match(ok.stdout, /Todo en orden/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
