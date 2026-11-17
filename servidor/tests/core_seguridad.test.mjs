import test from "node:test";
import assert from "node:assert/strict";
import { sentenciasSeguridad } from "../src/core/database/seguridad_tablas.js";

test("COR-10: activa RLS solo en las tablas que no lo tienen", () => {
  const sql = sentenciasSeguridad({ schema: "mi_sistema", tablasSinRls: ["persona", "usuario"] });
  assert.deepEqual(sql, [
    'ALTER TABLE "mi_sistema"."persona" ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE "mi_sistema"."usuario" ENABLE ROW LEVEL SECURITY',
  ]);
});

test("COR-10: en Supabase les saca a anon y authenticated todo acceso al schema", () => {
  const sql = sentenciasSeguridad({ schema: "mi_sistema", rolesApi: ["anon", "authenticated"] });
  assert.ok(sql.includes('REVOKE ALL ON ALL TABLES IN SCHEMA "mi_sistema" FROM anon, authenticated'));
  assert.ok(sql.includes('REVOKE USAGE ON SCHEMA "mi_sistema" FROM anon, authenticated'));
});

test("COR-10: sin Supabase y con todo protegido no hay nada que correr", () => {
  assert.deepEqual(sentenciasSeguridad({ schema: "mi_sistema" }), []);
});
