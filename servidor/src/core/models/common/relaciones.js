const METODOS_VALIDOS = new Set(["belongsTo", "hasOne", "hasMany", "belongsToMany"]);

/**
 * Aplica un array de asociaciones Sequelize declaradas como datos en vez de
 * llamadas sueltas. Cada entrada sigue siendo una asociación explícita y
 * unidireccional — exactamente lo mismo que el código que reemplaza. Esto
 * NO infiere la dirección inversa ni el alias: solo valida que lo que
 * escribiste tenga sentido y señala exactamente qué entrada falló si algo
 * quedó mal (modelo no importado, alias repetido, belongsToMany sin through).
 *
 * Forma de cada entrada:
 *   { tipo: "belongsTo" | "hasOne" | "hasMany" | "belongsToMany",
 *     from: Modelo, to: Modelo,
 *     as: "alias", foreignKey: "columna",
 *     through, otherKey, ... (cualquier otra opción de Sequelize) }
 */
export function aplicarRelaciones(relaciones) {
  const aliasVistos = new Map(); // "ModeloOrigen.alias" -> índice que lo declaró primero

  relaciones.forEach((rel, index) => {
    const { tipo, from, to, as, ...opciones } = rel ?? {};
    const etiqueta =
      `relaciones[${index}] (${tipo ?? "?"} ${from?.name ?? "?"} → ${to?.name ?? "?"}` +
      `${as ? `, as: "${as}"` : ""})`;

    if (!METODOS_VALIDOS.has(tipo)) {
      throw new Error(`${etiqueta}: "tipo" inválido — debe ser uno de: ${[...METODOS_VALIDOS].join(", ")}`);
    }
    if (typeof from?.[tipo] !== "function") {
      throw new Error(`${etiqueta}: "from" no es un modelo Sequelize válido (¿faltó importarlo o el nombre está mal escrito?)`);
    }
    if (typeof to?.name !== "string" || typeof to?.getTableName !== "function") {
      throw new Error(`${etiqueta}: "to" no es un modelo Sequelize válido (¿faltó importarlo o el nombre está mal escrito?)`);
    }
    if (tipo === "belongsToMany" && !opciones.through) {
      throw new Error(`${etiqueta}: belongsToMany requiere "through" (la tabla puente)`);
    }
    if (as) {
      const clave = `${from.name}.${as}`;
      if (aliasVistos.has(clave)) {
        throw new Error(
          `${etiqueta}: alias "${as}" duplicado en ${from.name} (ya lo usa relaciones[${aliasVistos.get(clave)}]). ` +
          `Sequelize pisaría la asociación anterior sin avisar.`
        );
      }
      aliasVistos.set(clave, index);
    }

    try {
      from[tipo](to, { as, ...opciones });
    } catch (err) {
      throw new Error(`${etiqueta}: Sequelize rechazó la asociación — ${err.message}`);
    }
  });
}
