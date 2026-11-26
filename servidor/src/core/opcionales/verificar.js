const repetidos = (lista) => [...new Set(lista.filter((valor, i) => lista.indexOf(valor) !== i))];

/**
 * MOD-07: choques que romperían o borrarían datos. Corre antes de tocar la base. `definiciones` es
 * la lista de core/modulos_opcionales.js; `opcionales` y `rubros`, los modulo.js activos.
 */
export function choquesDeModulos({ definiciones, opcionales, rubros, tablasRetiradas, codigosPermiso }) {
  const problemas = [];
  const tablasDe = (modulo) => (modulo.modelos ?? []).map((m) => m.tableName);
  const tablasRubros = rubros.flatMap(tablasDe);
  for (const opcional of opcionales) {
    const { prefijo } = definiciones.find((d) => d.codigo === opcional.codigo);
    for (const tabla of tablasDe(opcional)) {
      if (!tabla.startsWith(prefijo)) problemas.push(`La tabla "${tabla}" del módulo "${opcional.codigo}" tiene que empezar con "${prefijo}".`);
      if (tablasRubros.includes(tabla)) problemas.push(`La tabla "${tabla}" es del módulo "${opcional.codigo}" y también de un rubro de este proyecto.`);
      if (tablasRetiradas.includes(tabla)) problemas.push(`La tabla "${tabla}" es del módulo "${opcional.codigo}", pero servidor/src/proyecto/tablas_retiradas.js la borra en cada arranque: sacala de ahí.`);
    }
  }
  for (const rubro of rubros) {
    if (definiciones.some((d) => d.codigo === rubro.codigo)) problemas.push(`El rubro "${rubro.codigo}" se llama igual que un módulo del core: cambiale el código.`);
    // MOD-18: un rubro suma datos con su propia tabla unida a la del módulo, nunca dentro de su prefijo.
    for (const tabla of tablasDe(rubro)) {
      const duenio = definiciones.find((d) => tabla.startsWith(d.prefijo));
      if (duenio) problemas.push(`La tabla "${tabla}" del rubro "${rubro.codigo}" usa el prefijo del módulo "${duenio.codigo}" ("${duenio.prefijo}"). Ponele el prefijo del rubro y unila por su id (ej. variante_id).`);
    }
  }
  for (const codigo of repetidos(codigosPermiso)) problemas.push(`El permiso "${codigo}" está repetido: lo tienen un módulo del core y un rubro.`);
  return problemas;
}
