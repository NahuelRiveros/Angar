import { formatearNombre, claveMarca } from "../../services/common/formato_nombre.js";

const clave = (texto) => String(texto).trim().replace(/\s+/g, " ")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
const slug = (texto) => clave(texto).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
const identidad = (padreId, nombre) => `${padreId ?? "raiz"}:${clave(nombre)}`;

/** Agrega faltantes y reutiliza IDs; nunca renombra, mueve ni reactiva filas. */
export async function completarFamilias(Modelo, catalogo, transaction) {
  const filas = await Modelo.findAll({
    attributes: ["id", "nombre", "slug", "padre_id", "fecha_baja"],
    order: [["id", "ASC"]], raw: true, transaction,
  });
  const activas = filas.filter((f) => f.fecha_baja == null);
  const porNombre = new Map();
  for (const fila of activas) {
    const llave = identidad(fila.padre_id, fila.nombre);
    if (!porNombre.has(llave)) porNombre.set(llave, fila);
  }
  const porSlug = new Map(activas.map((f) => [f.slug, f]));
  const bajas = new Set(filas.filter((f) => f.fecha_baja != null)
    .flatMap((f) => [identidad(f.padre_id, f.nombre), `slug:${f.padre_id ?? "raiz"}:${f.slug}`]));
  const usados = new Set(porSlug.keys());
  const resultado = { familias: 0, categorias: 0, omitidas: [] };

  function preparar(nombreOriginal, padreId, nombreFamilia = null) {
    const nombre = formatearNombre(nombreOriginal);
    const llave = identidad(padreId, nombre);
    const deseado = slug(nombreFamilia ? `${nombreFamilia} ${nombre}` : nombre);
    const existente = porNombre.get(llave) ?? porSlug.get(deseado);
    if (existente && (existente.padre_id ?? null) === padreId) return { existente };
    if (bajas.has(llave) || bajas.has(`slug:${padreId ?? "raiz"}:${deseado}`)) {
      resultado.omitidas.push(nombreFamilia ? `${nombreFamilia} › ${nombre}` : nombre);
      return {};
    }
    let disponible = deseado;
    let sufijo = 2;
    while (usados.has(disponible)) {
      const cola = `-${sufijo++}`;
      disponible = `${deseado.slice(0, 80 - cola.length)}${cola}`;
    }
    usados.add(disponible);
    return { datos: { nombre, slug: disponible, padre_id: padreId, fecha_alta: new Date() } };
  }

  for (const [familia, categorias] of Object.entries(catalogo)) {
    const plan = preparar(familia, null);
    let raiz = plan.existente;
    if (plan.datos) {
      raiz = await Modelo.create(plan.datos, { transaction });
      resultado.familias++;
    }
    if (!raiz) continue;
    const nuevas = categorias.map((c) => preparar(c, raiz.id, familia).datos).filter(Boolean);
    if (nuevas.length) {
      await Modelo.bulkCreate(nuevas, { transaction });
      resultado.categorias += nuevas.length;
    }
  }
  return resultado;
}

/** Completa marcas por su clave única y asociaciones por el par de IDs. */
export async function completarMarcas(modelos, catalogo, transaction) {
  const { CategoriaDistribuidora, MarcaDistribuidora, MarcaCategoriaDistribuidora } = modelos;
  const categorias = await CategoriaDistribuidora.findAll({
    where: { fecha_baja: null }, attributes: ["id", "nombre", "slug", "padre_id"], raw: true, transaction,
  });
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const porNombre = new Map(categorias.map((c) => [identidad(c.padre_id, c.nombre), c]));
  const porRuta = new Map();
  const porSlug = new Map();
  for (const cat of categorias) {
    const padre = cat.padre_id != null ? porId.get(cat.padre_id) : null;
    if (cat.padre_id != null && !padre) continue;
    porRuta.set(clave(padre ? `${padre.nombre} › ${cat.nombre}` : cat.nombre), cat.id);
    porSlug.set(cat.slug, cat);
  }
  const faltantes = new Set();
  const marcas = Object.entries(catalogo).map(([texto, rutas]) => {
    const nombre = formatearNombre(texto);
    const ids = rutas.map((ruta) => {
      let id = porRuta.get(clave(ruta));
      // Una categoría renombrada con su slug original conserva su identidad.
      if (id == null) {
        const [familia, hija] = ruta.split(" › ");
        const raiz = porId.get(porRuta.get(clave(familia))) ?? porSlug.get(slug(familia));
        const raizId = raiz?.padre_id == null ? raiz?.id : undefined;
        const cat = (hija && raizId != null ? porNombre.get(identidad(raizId, hija)) : null)
          ?? porSlug.get(slug(hija ? `${familia} ${hija}` : familia));
        const padre = cat?.padre_id != null ? porId.get(cat.padre_id) : null;
        if (cat && (hija ? padre?.id === raizId : cat.padre_id == null)) id = cat.id;
      }
      if (id == null) faltantes.add(ruta);
      return id;
    }).filter((id) => id != null);
    return { nombre, clave: claveMarca(nombre), ids: [...new Set(ids)] };
  }).filter((m) => m.ids.length);

  const existentes = await MarcaDistribuidora.findAll({ attributes: ["id", "clave"], raw: true, transaction });
  const porClave = new Map(existentes.map((m) => [m.clave, m.id]));
  const nuevas = marcas.filter((m) => !porClave.has(m.clave));
  if (nuevas.length) {
    const creadas = await MarcaDistribuidora.bulkCreate(
      nuevas.map((m) => ({ nombre: m.nombre, clave: m.clave, fecha_alta: new Date() })),
      { transaction, returning: true },
    );
    for (const marca of creadas) porClave.set(marca.clave, marca.id);
  }
  const pares = await MarcaCategoriaDistribuidora.findAll({
    attributes: ["marca_id", "categoria_id"], raw: true, transaction,
  });
  const asociadas = new Set(pares.map((p) => `${p.marca_id}:${p.categoria_id}`));
  const asociaciones = [];
  for (const marca of marcas) {
    const marca_id = porClave.get(marca.clave);
    for (const categoria_id of marca.ids) {
      const par = `${marca_id}:${categoria_id}`;
      if (asociadas.has(par)) continue;
      asociadas.add(par);
      asociaciones.push({ marca_id, categoria_id });
    }
  }
  if (asociaciones.length) await MarcaCategoriaDistribuidora.bulkCreate(asociaciones, { transaction, ignoreDuplicates: true });
  return { marcas: nuevas.length, asociaciones: asociaciones.length, faltantes: [...faltantes] };
}
