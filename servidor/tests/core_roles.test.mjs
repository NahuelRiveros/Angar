import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { nombreRol, permisosConfig } from "../../core/permisos_config.js";

test("PER-14: los roles del sistema se muestran con nombres profesionales, sin 'admin' a la vista", () => {
  assert.equal(nombreRol("super_admin"), "Administrador del sistema");
  assert.equal(nombreRol("admin"), "Gerente general");
  assert.equal(nombreRol("supervisor"), "Encargado");
  for (const nombre of Object.values(permisosConfig.nombresRol)) assert.doesNotMatch(nombre, /\b(super ?)?admin\b/i);
});

test("PER-14: todo rol que el programa usa por código tiene nombre visible", () => {
  for (const codigo of [...permisosConfig.rolesTotales, ...permisosConfig.rolesFuera]) {
    assert.ok(permisosConfig.nombresRol[codigo], codigo);
  }
});

test("PER-14: un rol creado en el panel se muestra legible", () => {
  assert.equal(nombreRol("repositor_de_gondola"), "Repositor de gondola");
  assert.equal(nombreRol(undefined), "");
});

// Copia un archivo del core junto a un proyecto/ falso y lo importa: así se prueba con otra configuración.
async function conProyecto(archivoCore, proyecto) {
  const raiz = mkdtempSync(join(tmpdir(), "core_config_"));
  try {
    mkdirSync(join(raiz, "core"));
    mkdirSync(join(raiz, "proyecto"));
    cpSync(new URL(`../../core/${archivoCore}`, import.meta.url), join(raiz, "core", archivoCore));
    for (const [nombre, contenido] of Object.entries(proyecto)) writeFileSync(join(raiz, "proyecto", nombre), contenido);
    return await import(pathToFileURL(join(raiz, "core", archivoCore)).href);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

test("PER-37: un rubro suma sus roles sin permisos y elige el rol de quien se registra", async () => {
  const { permisosConfig: conRubro } = await conProyecto("permisos_config.js", {
    "permisos_rubros.js": `export const PERMISOS_DE_RUBROS = [];
      export const ROLES_DE_RUBROS = { fuera: { jugador: "Jugador", organizador: "Organizador" }, alRegistrarse: "jugador" };`,
  });
  assert.deepEqual(conRubro.rolesFuera, ["cliente", "jugador", "organizador"]);
  assert.equal(conRubro.rolAlRegistrarse, "jugador");
  assert.equal(conRubro.nombresRol.organizador, "Organizador", "se crea con nombre al arrancar");
  assert.equal(conRubro.nombresRol.admin, "Gerente general", "los del core siguen");
});

test("PER-37: un proyecto que no declara roles sigue con cliente", async () => {
  const { permisosConfig: sinRubro } = await conProyecto("permisos_config.js", { "permisos_rubros.js": "export const PERMISOS_DE_RUBROS = [];" });
  assert.deepEqual(sinRubro.rolesFuera, ["cliente"]);
  assert.equal(sinRubro.rolAlRegistrarse, "cliente");
});

test("SIS-56: la suscripción del software se apaga solo si el proyecto lo pide", async () => {
  const config = (extra) => ({ "client_config.js": `export const clientConfig = { id: "x"${extra} };` });
  assert.equal((await conProyecto("suscripcion_software_config.js", config(", suscripcionDelSoftware: false"))).suscripcionDelSoftwareActiva, false);
  assert.equal((await conProyecto("suscripcion_software_config.js", config(""))).suscripcionDelSoftwareActiva, true, "sin el dato, prendida");
});
