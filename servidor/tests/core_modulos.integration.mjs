import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Contra el PostgreSQL LOCAL (.env.local o variables DB_*), en un schema nuevo que se borra al terminar.
// Nunca usa la base remota. Spec: docs/specs/core/modulos.md.
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true });
process.env.NODE_ENV = "test";
process.env.BD_URL = "";
process.env.BD_URL_SUPABASE = "";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_SSL = "false";
process.env.SUPERADMIN_USUARIO = "";
const schema = "core_test_" + randomUUID().replaceAll("-", "");
process.env.DB_SCHEMA = schema;
process.env.BD_ESQUEMA = schema;

const { sequelize } = await import("../src/core/database/sequelize.js");
const { bootstrap_database } = await import("../src/core/database/bootstrap.js");
const { deshacerMigracion, estadoMigraciones, subirMigraciones } = await import("../src/core/database/migraciones.js");
const { seed_rbac } = await import("../src/core/database/seed/seed_rbac.js");
const { guardarPermisosDeRol, sincronizarPermisos } = await import("../src/core/services/usuarios/permisos_service.js");
const { Modulo, Permiso, Rol, RolPermiso } = await import("../src/core/models/index.js");
const { MODULOS_OPCIONALES } = await import("../../core/modulos_opcionales.js");
const { opcionalesActivos } = await import("../src/core/opcionales/registro.js");
const { permisosConfig } = await import("../../core/permisos_config.js");

const modulo = (carpeta) => ({ codigo: "prueba", migraciones: new URL(`./fixtures/modulo_prueba/${carpeta}/`, import.meta.url) });
const MODULO = modulo("migraciones");
const base = { sequelize, schema };
const tablas = async () => (await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = :schema", { replacements: { schema } }))[0].map((f) => f.tablename);

test("PostgreSQL: módulos opcionales", async (t) => {
  let creado = false;
  try {
    await sequelize.authenticate();
    await bootstrap_database();
    creado = true;

    await t.test("MOD-02 y MOD-13: lo apagado no crea tablas; sin módulos prendidos ni siquiera _migraciones", async () => {
      const existentes = await tablas();
      assert.ok(existentes.includes("usuario"), "las del core sí");
      const prendidos = opcionalesActivos.map((m) => m.codigo);
      for (const { codigo, prefijo } of MODULOS_OPCIONALES.filter((m) => !prendidos.includes(m.codigo))) {
        assert.deepEqual(existentes.filter((nombre) => nombre.startsWith(prefijo)), [], codigo);
      }
      assert.equal(existentes.includes("_migraciones"), opcionalesActivos.some((m) => m.migraciones));
    });

    await t.test("MOD-08: se aplican en orden y una sola vez, aunque arranquen dos servidores juntos", async () => {
      const [uno, dos] = await Promise.all([subirMigraciones([MODULO], base), subirMigraciones([MODULO], base)]);
      assert.deepEqual([...uno, ...dos].sort(), ["prueba/001_cosas", "prueba/002_color"]);
      assert.deepEqual(await subirMigraciones([MODULO], base), []);
      await sequelize.query(`INSERT INTO "${schema}".pru_cosa (nombre, color) VALUES ('Casco', 'rojo')`);
    });

    await t.test("MOD-08: una que falla no deja nada a medias y el mensaje dice cuál fue", async () => {
      await assert.rejects(subirMigraciones([modulo("migraciones_con_error")], base), /prueba\/003_rota falló y no se aplicó/);
      assert.equal((await tablas()).includes("pru_a_medias"), false);
      assert.equal((await estadoMigraciones([MODULO], base)).length, 2);
    });

    await t.test("MOD-03 y COR-10: con el módulo apagado los datos quedan, y sus tablas siguen protegidas", async () => {
      await bootstrap_database(); // este proyecto no lo tiene prendido
      const [[fila]] = await sequelize.query(`SELECT count(*)::int AS cantidad FROM "${schema}".pru_cosa`);
      assert.equal(fila.cantidad, 1);
      const [sinRls] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = :schema AND NOT rowsecurity", { replacements: { schema } });
      assert.deepEqual(sinRls, []);
    });

    await t.test("MOD-09: cada migración se puede deshacer y volver a subir", async () => {
      assert.equal(await deshacerMigracion(MODULO, base), "002_color");
      assert.deepEqual((await estadoMigraciones([MODULO], base)).map((m) => m.aplicada), [true, false]);
      assert.equal(await deshacerMigracion(MODULO, base), "001_cosas");
      assert.equal((await tablas()).includes("pru_cosa"), false);
      assert.equal(await deshacerMigracion(MODULO, base), null);
      assert.deepEqual(await subirMigraciones([MODULO], base), ["prueba/001_cosas", "prueba/002_color"]);
    });

    await t.test("MOD-03: apagar un módulo conserva lo tildado en Roles y permisos", async () => {
      const apagados = ["prueba.ver"];
      await seed_rbac();
      await sincronizarPermisos();
      const grupo = await Modulo.create({ codigo: "prueba", descripcion: "Prueba", orden: 99 });
      const permiso = await Permiso.create({ codigo: "prueba.ver", modulo_id: grupo.id, accion: "ver", descripcion: "Ver" });
      const rol = await Rol.findOne({ where: { codigo: permisosConfig.rolPersonalPorDefecto } });
      await RolPermiso.create({ rol_id: rol.id, permiso_id: permiso.id });
      const tildado = () => RolPermiso.count({ where: { rol_id: rol.id, permiso_id: permiso.id } });

      await sincronizarPermisos({ apagados });
      assert.equal(await tildado(), 1, "el arranque no lo borra");
      const visible = await guardarPermisosDeRol(rol.id, ["usuarios.gestionar"], { apagados });
      assert.deepEqual(visible.permisos, ["usuarios.gestionar"], "no se ve en el panel");
      assert.equal(await tildado(), 1, "guardar otros permisos tampoco");

      await sincronizarPermisos({ apagados: [] });
      assert.equal(await Permiso.count({ where: { codigo: "prueba.ver" } }), 0, "PER-31: lo que sale de la lista sí se borra");
    });
  } finally {
    if (creado) {
      assert.match(schema, /^core_test_[a-f0-9]{32}$/);
      await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await sequelize.close();
  }
});
