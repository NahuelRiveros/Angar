import { QueryTypes } from "sequelize";

// Roles con los que Supabase expone las tablas por su API REST (PostgREST). En Neon o en un
// PostgreSQL propio no existen y no hay nada que revocar.
export const ROLES_API_PUBLICA = ["anon", "authenticated"];

/**
 * COR-10: qué SQL cierra las tablas del schema a la API pública.
 * - RLS prendido y sin políticas: nadie que entre por PostgREST lee ni escribe filas. El
 *   servidor sigue andando porque se conecta con el dueño de las tablas, que no pasa por RLS.
 * - Sin permisos para anon/authenticated: segunda barrera por si RLS se apaga a mano.
 * `schema` ya viene validado (solo minúsculas, números y _) por database/sequelize.js.
 */
export function sentenciasSeguridad({ schema, tablasSinRls = [], rolesApi = [] }) {
  const sentencias = tablasSinRls.map((tabla) => `ALTER TABLE "${schema}"."${tabla}" ENABLE ROW LEVEL SECURITY`);
  if (rolesApi.length) {
    const roles = rolesApi.join(", ");
    sentencias.push(
      `REVOKE ALL ON ALL TABLES IN SCHEMA "${schema}" FROM ${roles}`,
      `REVOKE ALL ON ALL SEQUENCES IN SCHEMA "${schema}" FROM ${roles}`,
      `REVOKE USAGE ON SCHEMA "${schema}" FROM ${roles}`,
    );
  }
  return sentencias;
}

/** Aplica COR-10 en cada arranque: solo toca lo que falta, así que corre en milisegundos. */
export async function asegurarTablas(sequelize, schema) {
  if (schema === "public") {
    console.warn('⚠️  DB_SCHEMA=public: en Supabase ese schema lo publica la API REST. Usá uno propio (ej. "mi_sistema").');
  }

  const tablasSinRls = (await sequelize.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = :schema AND NOT rowsecurity",
    { replacements: { schema }, type: QueryTypes.SELECT },
  )).map((fila) => fila.tablename);

  const rolesApi = (await sequelize.query(
    "SELECT rolname FROM pg_roles WHERE rolname IN (:roles)",
    { replacements: { roles: ROLES_API_PUBLICA }, type: QueryTypes.SELECT },
  )).map((fila) => fila.rolname);

  for (const sentencia of sentenciasSeguridad({ schema, tablasSinRls, rolesApi })) {
    await sequelize.query(sentencia);
  }
  if (tablasSinRls.length) console.log(`🔒 RLS activado en ${tablasSinRls.length} tabla(s): ${tablasSinRls.join(", ")}`);
}
