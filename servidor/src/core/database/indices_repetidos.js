import { QueryTypes } from "sequelize";

/**
 * SIS-52: borra las restricciones únicas repetidas que dejó `sync({ alter: true })` (`…_key1`, `…_key2`…),
 * solo cuando la original `…_key` existe en la misma tabla sobre exactamente las mismas columnas. Deja la
 * original, no toca datos y solo mira el schema del proyecto. Idempotente. Devuelve cuántas borró.
 */
export async function borrarUnicosRepetidos(sequelize, schema) {
  const repetidas = await sequelize.query(`
    SELECT t.relname AS tabla, copia.conname AS nombre
    FROM pg_constraint copia
    JOIN pg_class t ON t.oid = copia.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = :schema
      AND copia.contype = 'u'
      AND copia.conname ~ '_key[0-9]+$'
      AND EXISTS (
        SELECT 1 FROM pg_constraint original
        WHERE original.conrelid = copia.conrelid
          AND original.contype IN ('u', 'p')
          AND original.conname = regexp_replace(copia.conname, '[0-9]+$', '')
          AND original.conkey = copia.conkey
      )
    ORDER BY 1, 2`, { replacements: { schema }, type: QueryTypes.SELECT });
  const comillas = (nombre) => `"${String(nombre).replaceAll('"', '""')}"`;
  for (const { tabla, nombre } of repetidas) {
    await sequelize.query(`ALTER TABLE ${comillas(schema)}.${comillas(tabla)} DROP CONSTRAINT IF EXISTS ${comillas(nombre)}`);
  }
  return repetidas.length;
}
