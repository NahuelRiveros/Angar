import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.JWT_SECRET = "clave-solo-para-tests";

const { MODULOS_OPCIONALES, TIPOS_PROYECTO, conLoQueNecesitan, permisosOpcionales, resolverModulos, textoGateConfig } = await import("../../core/modulos_opcionales.js");
const { choquesDeModulos } = await import("../src/core/opcionales/verificar.js");
const { CODIGOS_CARGABLES, opcionalesActivos } = await import("../src/core/opcionales/registro.js");
const { exigirModulosValidos } = await import("../src/core/modulos_activos.js");
const { leerMigraciones, problemaParaDeshacer } = await import("../src/core/database/migraciones.js");
const { ipVisitante } = await import("../src/core/middleware/ip_visitante.js");
const { projectModules } = await import("../../proyecto/gate_config.js");

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PERMISOS = (codigo) => ({ grupos: [{ codigo, nombre: codigo }], permisos: [{ codigo: `${codigo}.ver`, grupo: codigo, nombre: "Ver", porDefecto: [] }] });
// Módulos de mentira: la lógica no depende de cuáles existan hoy. A propósito, en desorden.
const FALSOS = [
  { codigo: "cobros", nombre: "Cobros", descripcion: "", prefijo: "cob_", requiere: ["pedidos"], permisos: PERMISOS("cobros") },
  { codigo: "pedidos", nombre: "Pedidos", descripcion: "", prefijo: "ped_", requiere: ["catalogo"], permisos: PERMISOS("pedidos") },
  { codigo: "catalogo", nombre: "Catálogo", descripcion: "", prefijo: "cat_", requiere: [], permisos: PERMISOS("catalogo") },
  { codigo: "futuro", nombre: "Futuro", descripcion: "", prefijo: "fut_", requiere: [], disponible: false },
];
const TODO = { catalogo: true, pedidos: true, cobros: true };

function enCarpetaTemporal(accion) {
  const carpeta = mkdtempSync(path.join(tmpdir(), "core_modulos_"));
  try { return accion(carpeta); } finally { rmSync(carpeta, { recursive: true, force: true }); }
}

test("MOD-01: lo que no figura o está en false cuenta como apagado", () => {
  for (const gate of [{}, undefined, { catalogo: false }]) assert.deepEqual(resolverModulos(gate, FALSOS), { activos: [], problemas: [] });
  assert.deepEqual(resolverModulos({ catalogo: true }, FALSOS).activos, ["catalogo"]);
});

test("MOD-01: la lista del core está bien armada", () => {
  const codigos = MODULOS_OPCIONALES.map((m) => m.codigo);
  const prefijos = MODULOS_OPCIONALES.map((m) => m.prefijo);
  assert.equal(new Set(codigos).size, codigos.length, "códigos sin repetir");
  assert.equal(new Set(prefijos).size, prefijos.length, "prefijos sin repetir");
  for (const { codigo, prefijo, nombre, descripcion, requiere } of MODULOS_OPCIONALES) {
    assert.match(prefijo, /^[a-z]{3}_$/, codigo);
    assert.ok(nombre && descripcion, codigo);
    for (const r of requiere) assert.ok(codigos.includes(r), `${codigo} necesita ${r}`);
  }
  assert.doesNotThrow(() => conLoQueNecesitan(codigos), "sin dependencias en círculo");
});

test("MOD-02: un módulo apagado no se carga ni suma permisos", () => {
  const { grupos, permisos } = permisosOpcionales({ catalogo: true }, FALSOS);
  assert.deepEqual(grupos.map((g) => g.codigo), ["catalogo"]);
  assert.deepEqual(permisos.map((p) => p.codigo), ["catalogo.ver"]);
  assert.deepEqual(opcionalesActivos.map((m) => m.codigo), resolverModulos(projectModules).activos);
});

test("MOD-02: los módulos disponibles son exactamente los que el servidor sabe cargar", () => {
  assert.deepEqual([...CODIGOS_CARGABLES].sort(), MODULOS_OPCIONALES.filter((m) => m.disponible !== false).map((m) => m.codigo).sort());
});

test("MOD-03: los permisos de un módulo apagado se informan aparte, para no borrar lo tildado", () => {
  assert.deepEqual(permisosOpcionales({ catalogo: true }, FALSOS).codigosApagados, ["cobros.ver", "pedidos.ver"]);
  assert.deepEqual(permisosOpcionales(TODO, FALSOS).codigosApagados, []);
});

test("MOD-03: un código que usa un rubro de este proyecto nunca cuenta como de un módulo apagado", async () => {
  const { CODIGOS_PERMISO, CODIGOS_PERMISO_APAGADOS } = await import("../../core/permisos_config.js");
  assert.deepEqual(CODIGOS_PERMISO_APAGADOS.filter((codigo) => CODIGOS_PERMISO.includes(codigo)), []);
});

test("MOD-04: prender un módulo sin los que necesita es un problema que dice cuáles faltan", () => {
  const { activos, problemas } = resolverModulos({ cobros: true, pedidos: true }, FALSOS);
  assert.deepEqual(activos, [], "cobros tampoco: depende de pedidos, que no puede cargarse");
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /"pedidos".*necesita: catalogo/);
});

test("MOD-05: prender un módulo que todavía no existe es un problema claro", () => {
  const { activos, problemas } = resolverModulos({ futuro: true, catalogo: true }, FALSOS);
  assert.deepEqual(activos, ["catalogo"]);
  assert.match(problemas[0], /"futuro".*todavía no está/);
});

test("MOD-06: cada módulo va después de los que necesita y un círculo se detecta", () => {
  assert.deepEqual(resolverModulos(TODO, FALSOS).activos, ["catalogo", "pedidos", "cobros"]);
  const circulo = [{ codigo: "a", requiere: ["b"] }, { codigo: "b", requiere: ["a"] }];
  assert.throws(() => conLoQueNecesitan(["a"], circulo), /círculo: a → b → a/);
});

test("MOD-07: detecta los choques que romperían o borrarían datos", () => {
  const opcional = (...tablas) => ({ codigo: "catalogo", modelos: tablas.map((tableName) => ({ tableName })) });
  const base = { definiciones: FALSOS, opcionales: [opcional("cat_producto")], rubros: [{ codigo: "mi_rubro", modelos: [{ tableName: "producto" }] }], tablasRetiradas: ["producto", "carrito"], codigosPermiso: ["catalogo.ver", "productos.editar"] };
  assert.deepEqual(choquesDeModulos(base), []);
  const primero = (cambio) => { const r = choquesDeModulos({ ...base, ...cambio }); assert.equal(r.length, 1, r.join(" | ")); return r[0]; };
  assert.match(primero({ opcionales: [opcional("producto_nuevo")] }), /tiene que empezar con "cat_"/);
  const robada = choquesDeModulos({ ...base, rubros: [{ codigo: "mi_rubro", modelos: [{ tableName: "cat_producto" }] }] });
  assert.equal(robada.length, 2);
  assert.match(robada[0], /también de un rubro/);
  assert.match(primero({ tablasRetiradas: ["cat_producto"] }), /la borra en cada arranque/);
  assert.match(primero({ rubros: [{ codigo: "catalogo", modelos: [] }] }), /se llama igual/);
  assert.match(primero({ codigosPermiso: ["pedidos.ver", "pedidos.ver"] }), /"pedidos.ver" está repetido/);
});

test("MOD-18: un rubro suma datos con su propia tabla, nunca con el prefijo de un módulo (prendido o no)", () => {
  const base = { definiciones: FALSOS, opcionales: [], tablasRetiradas: [], codigosPermiso: [] };
  const con = (tableName) => choquesDeModulos({ ...base, rubros: [{ codigo: "moto", modelos: [{ tableName }] }] });
  assert.deepEqual(con("moto_variante_extra"), []);
  assert.match(con("cat_variante_talle").join(), /usa el prefijo del módulo "catalogo" \("cat_"\)/);
});

test("MOD-04, MOD-05 y MOD-07: la configuración de este proyecto es válida", () => {
  assert.doesNotThrow(exigirModulosValidos);
});

test("MOD-08: las migraciones se leen en orden y cada una necesita su par y un número propio", () => enCarpetaTemporal((carpeta) => {
  const url = pathToFileURL(carpeta + path.sep);
  const escribir = (...archivos) => archivos.forEach((a) => writeFileSync(path.join(carpeta, a), "SELECT 1;"));
  escribir("002_b.subir.sql", "002_b.deshacer.sql", "001_a.subir.sql", "001_a.deshacer.sql");
  assert.deepEqual(leerMigraciones(url).map((m) => m.nombre), ["001_a", "002_b"]);
  escribir("003_c.subir.sql");
  assert.throws(() => leerMigraciones(url), /003_c necesita los dos archivos/);
  escribir("003_c.deshacer.sql", "003_otra.subir.sql", "003_otra.deshacer.sql");
  assert.throws(() => leerMigraciones(url), /dos migraciones con el número 003/);
  escribir("cualquiera.sql");
  assert.throws(() => leerMigraciones(url), /Nombre de migración no válido/);
}));

test("MOD-09: deshacer solo se puede en la base local y nunca en el esquema de producción", () => {
  const local = { entorno: "development", urlRemota: "", host: "localhost", esquema: "prueba", esquemaProduccion: "real" };
  assert.equal(problemaParaDeshacer(local), null);
  for (const cambio of [{ entorno: "production" }, { urlRemota: "postgres://x" }, { host: "db.remota.com" }, { esquema: "real" }]) {
    assert.ok(problemaParaDeshacer({ ...local, ...cambio }), JSON.stringify(cambio));
  }
});

// Corre el script de verdad en una carpeta aparte con lo mínimo que usa.
const NODE = process.execPath;
function nuevoProyecto(carpeta, ...args) {
  for (const parte of ["core", "scripts", "plantilla_proyecto"]) cpSync(path.join(raiz, parte), path.join(carpeta, parte), { recursive: true });
  writeFileSync(path.join(carpeta, "package.json"), '{"type":"module"}');
  return execFileSync(NODE, ["scripts/nuevo_proyecto.mjs", ...args], { cwd: carpeta, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
const gateDe = async (carpeta) => (await import(pathToFileURL(path.join(carpeta, "proyecto/gate_config.js")).href)).projectModules;

test("MOD-10: --tipo prende lo del tipo que exista en el core y deja el resto apagado", async () => {
  for (const [tipo, { modulos }] of Object.entries(TIPOS_PROYECTO)) {
    const esperados = conLoQueNecesitan(modulos);
    assert.deepEqual([...esperados].sort(), [...modulos].sort(), `${tipo}: la lista ya incluye lo que necesita`);
    const carpeta = mkdtempSync(path.join(tmpdir(), "core_tipo_"));
    try {
      nuevoProyecto(carpeta, "--tipo", tipo);
      const gate = await gateDe(carpeta);
      const { activos } = resolverModulos(Object.fromEntries(esperados.map((c) => [c, true])));
      assert.deepEqual(gate, Object.fromEntries(MODULOS_OPCIONALES.map((m) => [m.codigo, activos.includes(m.codigo)])), tipo);
      assert.deepEqual(resolverModulos(gate).problemas, [], "un proyecto recién creado arranca");
    } finally { rmSync(carpeta, { recursive: true, force: true }); }
  }
});

test("MOD-10: --con suma un módulo; un nombre mal escrito no crea nada; lo existente no se pisa", () => {
  enCarpetaTemporal((carpeta) => assert.match(nuevoProyecto(carpeta, "--tipo", "catalogo", "--con", "stock"), /stock/));
  for (const args of [["--tipo", "ecomerce"], ["--con", "stok"], ["--tip", "x"]]) {
    enCarpetaTemporal((carpeta) => {
      assert.throws(() => nuevoProyecto(carpeta, ...args), (e) => e.status === 1 && e.stderr.length > 0);
      assert.equal(existsSync(path.join(carpeta, "proyecto")), false, args.join(" "));
    });
  }
  enCarpetaTemporal((carpeta) => {
    mkdirSync(path.join(carpeta, "proyecto"));
    writeFileSync(path.join(carpeta, "proyecto/gate_config.js"), "export const projectModules = { mio: true };");
    assert.match(nuevoProyecto(carpeta, "--tipo", "ecommerce"), /no se cambió/);
    assert.match(readFileSync(path.join(carpeta, "proyecto/gate_config.js"), "utf8"), /mio: true/);
  });
});

test("MOD-11: la plantilla lista todos los módulos, apagados", () => {
  const plantilla = readFileSync(path.join(raiz, "plantilla_proyecto/proyecto/gate_config.js"), "utf8").replaceAll("\r\n", "\n");
  assert.equal(plantilla, textoGateConfig(), "regenerar con textoGateConfig() de core/modulos_opcionales.js");
  assert.doesNotMatch(plantilla.split("projectModules")[1], /: +true/);
});

test("MOD-12: prender o apagar un rubro cambia la huella de las tablas", () => enCarpetaTemporal((carpeta) => {
  for (const parte of ["core", "servidor/src/core", "servidor/src/proyecto", "proyecto"]) cpSync(path.join(raiz, parte), path.join(carpeta, parte), { recursive: true });
  writeFileSync(path.join(carpeta, "package.json"), '{"type":"module"}');
  const huella = () => execFileSync(NODE, ["-e", 'import("./servidor/src/core/database/schema_hash.js").then((m) => console.log(m.calcularHashEsquema()))'], { cwd: carpeta, encoding: "utf8" });
  const gate = (valor) => writeFileSync(path.join(carpeta, "proyecto/gate_config.js"), `export const projectModules = { x: ${valor} };`);
  gate(false);
  const apagado = huella();
  assert.equal(huella(), apagado, "sin cambios, la misma");
  gate(true);
  assert.notEqual(huella(), apagado);
}));

test("MOD-13: un proyecto que ya existe sigue igual con su gate_config de siempre", () => {
  for (const gate of [{ eccomerce_distribuidora: true }, { torneos: true }, { tienda_ropa: true }, { taller_motos: true }]) {
    assert.deepEqual(resolverModulos(gate), { activos: [], problemas: [] });
    assert.deepEqual(permisosOpcionales(gate).permisos, []);
  }
});

test("MOD-14: el núcleo llega a los módulos opcionales solo por sus registros", () => {
  const problemas = [];
  for (const carpeta of ["frontend/src/core", "servidor/src/core"]) {
    for (const e of readdirSync(path.join(raiz, carpeta), { recursive: true, withFileTypes: true })) {
      if (!e.isFile() || !/\.(m?js|jsx)$/.test(e.name)) continue;
      const archivo = path.relative(raiz, path.join(e.parentPath, e.name)).split(path.sep).join("/");
      if (archivo.includes("/opcionales/")) continue;
      for (const [, spec] of readFileSync(path.join(raiz, archivo), "utf8").matchAll(/["'](\.{1,2}\/[^"'\n]*opcionales\/[^"'\n]+)["']/g)) {
        if (!/opcionales\/(registro|registro_pantallas|verificar|enganches)\.js$/.test(spec)) problemas.push(`${archivo} → ${spec}`);
      }
    }
  }
  assert.deepEqual(problemas, []);
});

test("COR-21: en Render el tope cuenta por el visitante; afuera no se cree en el encabezado", () => {
  const req = { ip: "10.0.0.1", get: (nombre) => (nombre === "cf-connecting-ip" ? "200.45.1.2" : undefined) };
  assert.equal(ipVisitante(req, true), "200.45.1.2");
  assert.equal(ipVisitante(req, false), "10.0.0.1", "inventar el encabezado no da intentos nuevos");
  assert.equal(ipVisitante({ ip: "10.0.0.1", get: () => undefined }, true), "10.0.0.1");
});
