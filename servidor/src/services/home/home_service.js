import { Readable } from "stream";
import { cloudinary } from "../../configuracion_servidor/cloudinary.js";
import { HomeArea, HomeContenido, HomeTexto, HomePilar, HomeContacto } from "../../models/index.js";
import { crearCrudService } from "../common/crud_service.js";

// cambiarEstadoContenido/eliminarContenido quedan manuales a propósito:
// el primero pisa "actualizado_en" (columna que Pilar/Contacto no tienen) y
// el segundo borra el archivo en Cloudinary antes de la fila — no son genéricos.
const contenidoCrud = crearCrudService(HomeContenido, {
  defaultOrder: [["area_id", "ASC"], ["orden", "ASC"]],
  include: [{ model: HomeArea, as: "area", attributes: ["id", "descripcion"] }],
});
const pilaresCrud   = crearCrudService(HomePilar,   { defaultOrder: [["orden", "ASC"]] });
const contactosCrud = crearCrudService(HomeContacto, { defaultOrder: [["orden", "ASC"]] });

function subirBufferACloudinary(buffer, { resourceType, area }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `mipadel/home/${area}`, resource_type: resourceType },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
}

export async function listarAreas() {
  return HomeArea.findAll({ order: [["id", "ASC"]] });
}

export async function obtenerContenidoPublico() {
  const areas = await HomeArea.findAll({
    include: [{
      model: HomeContenido,
      as: "contenidos",
      where: { activo: true },
      required: false,
      attributes: ["id", "tipo_media", "titulo", "descripcion", "cloudinary_url", "orden"],
    }],
    order: [["id", "ASC"], [{ model: HomeContenido, as: "contenidos" }, "orden", "ASC"]],
  });

  return areas.map((area) => ({
    id: area.id,
    descripcion: area.descripcion,
    contenidos: area.contenidos,
  }));
}

export async function listarContenidoAdmin({ area_id } = {}) {
  const { items } = await contenidoCrud.listar({ where: area_id ? { area_id } : undefined });
  return items;
}

export async function crearContenido({ area_id, titulo, descripcion, orden, buffer, mimetype }) {
  if (!area_id) return { ok: false, codigo: "VALIDACION", mensaje: "area_id es obligatorio" };
  if (!buffer) return { ok: false, codigo: "VALIDACION", mensaje: "Falta el archivo a subir" };

  const area = await HomeArea.findByPk(area_id);
  if (!area) return { ok: false, codigo: "AREA_NO_EXISTE", mensaje: "El área indicada no existe" };

  const esVideo = String(mimetype ?? "").startsWith("video/");
  const esImagen = String(mimetype ?? "").startsWith("image/");
  if (!esVideo && !esImagen) {
    return { ok: false, codigo: "VALIDACION", mensaje: "El archivo debe ser una imagen o un video" };
  }

  const subida = await subirBufferACloudinary(buffer, {
    resourceType: esVideo ? "video" : "image",
    area: area.descripcion.toLowerCase().replace(/\s+/g, "-"),
  });

  const contenido = await HomeContenido.create({
    area_id,
    tipo_media: esVideo ? "video" : "imagen",
    titulo: titulo || null,
    descripcion: descripcion || null,
    orden: Number.isFinite(Number(orden)) ? Number(orden) : 0,
    cloudinary_url: subida.secure_url,
    cloudinary_public_id: subida.public_id,
  });

  return { ok: true, mensaje: "Contenido subido correctamente", data: contenido };
}

export async function actualizarContenido(id, { titulo, descripcion, orden, activo }) {
  const contenido = await HomeContenido.findByPk(id);
  if (!contenido) return null;

  const updates = { actualizado_en: new Date() };
  if (titulo !== undefined) updates.titulo = titulo || null;
  if (descripcion !== undefined) updates.descripcion = descripcion || null;
  if (orden !== undefined) updates.orden = Number(orden) || 0;
  if (activo !== undefined) updates.activo = Boolean(activo);

  await contenido.update(updates);
  return contenido;
}

export async function cambiarEstadoContenido(id, activo) {
  const contenido = await HomeContenido.findByPk(id);
  if (!contenido) return null;
  await contenido.update({ activo, actualizado_en: new Date() });
  return contenido;
}

export async function eliminarContenido(id) {
  const contenido = await HomeContenido.findByPk(id);
  if (!contenido) return null;

  await cloudinary.uploader.destroy(contenido.cloudinary_public_id, {
    resource_type: contenido.tipo_media === "video" ? "video" : "image",
  });
  await contenido.destroy();
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Textos / pilares / contacto — contenido editable del home que no es galería
// ────────────────────────────────────────────────────────────────────────────

/** Un solo fetch público para todo lo que no es la galería de medios. */
export async function obtenerConfigPublica() {
  const [textosRows, pilares, contactos, areas] = await Promise.all([
    HomeTexto.findAll({ attributes: ["clave", "valor"] }),
    HomePilar.findAll({ where: { activo: true }, order: [["orden", "ASC"]] }),
    HomeContacto.findAll({ where: { activo: true }, order: [["orden", "ASC"]] }),
    HomeArea.findAll({ attributes: ["descripcion", "layout"] }),
  ]);

  const textos = Object.fromEntries(textosRows.map((t) => [t.clave, t.valor]));
  const layoutPorArea = Object.fromEntries(areas.map((a) => [a.descripcion, a.layout]));

  return { textos, pilares, contactos, layoutPorArea };
}

export async function listarTextosAdmin() {
  return HomeTexto.findAll({ order: [["seccion", "ASC"], ["orden", "ASC"]] });
}

/** cambios = { clave: valor, ... } — actualiza varias claves de una sola vez. */
export async function actualizarTextos(cambios) {
  const claves = Object.keys(cambios ?? {});
  if (!claves.length) return { ok: false, codigo: "VALIDACION", mensaje: "No se enviaron cambios" };

  for (const clave of claves) {
    await HomeTexto.update(
      { valor: cambios[clave], actualizado_en: new Date() },
      { where: { clave } }
    );
  }
  return { ok: true, mensaje: "Textos actualizados correctamente" };
}

export async function listarPilaresAdmin() {
  const { items } = await pilaresCrud.listar();
  return items;
}

export async function crearPilar({ icono, titulo, texto, orden }) {
  if (!icono || !titulo?.trim() || !texto?.trim())
    return { ok: false, codigo: "VALIDACION", mensaje: "icono, titulo y texto son obligatorios" };

  const pilar = await HomePilar.create({
    icono, titulo: titulo.trim(), texto: texto.trim(),
    orden: Number.isFinite(Number(orden)) ? Number(orden) : 0,
  });
  return { ok: true, mensaje: "Pilar creado correctamente", pilar };
}

export async function actualizarPilar(id, { icono, titulo, texto, orden }) {
  const pilar = await HomePilar.findByPk(id);
  if (!pilar) return { ok: false, codigo: "NO_EXISTE", mensaje: "El pilar no existe" };

  const updates = {};
  if (icono !== undefined) updates.icono = icono;
  if (titulo !== undefined) updates.titulo = titulo.trim();
  if (texto !== undefined) updates.texto = texto.trim();
  if (orden !== undefined) updates.orden = Number(orden) || 0;

  await pilar.update(updates);
  return { ok: true, mensaje: "Pilar actualizado correctamente", pilar };
}

export async function cambiarEstadoPilar(id, activo) {
  const pilar = await pilaresCrud.cambiarEstado(id, activo);
  if (!pilar) return { ok: false, codigo: "NO_EXISTE", mensaje: "El pilar no existe" };
  return { ok: true, mensaje: activo ? "Pilar activado correctamente" : "Pilar desactivado correctamente", pilar };
}

export async function eliminarPilar(id) {
  const eliminado = await pilaresCrud.eliminar(id);
  if (!eliminado) return { ok: false, codigo: "NO_EXISTE", mensaje: "El pilar no existe" };
  return { ok: true, mensaje: "Pilar eliminado correctamente" };
}

export async function listarContactosAdmin() {
  const { items } = await contactosCrud.listar();
  return items;
}

export async function crearContacto({ icono, label, valor, href, orden }) {
  if (!icono || !label?.trim() || !valor?.trim())
    return { ok: false, codigo: "VALIDACION", mensaje: "icono, label y valor son obligatorios" };

  const contacto = await HomeContacto.create({
    icono, label: label.trim(), valor: valor.trim(), href: href?.trim() || null,
    orden: Number.isFinite(Number(orden)) ? Number(orden) : 0,
  });
  return { ok: true, mensaje: "Contacto creado correctamente", contacto };
}

export async function actualizarContacto(id, { icono, label, valor, href, orden }) {
  const contacto = await HomeContacto.findByPk(id);
  if (!contacto) return { ok: false, codigo: "NO_EXISTE", mensaje: "El contacto no existe" };

  const updates = {};
  if (icono !== undefined) updates.icono = icono;
  if (label !== undefined) updates.label = label.trim();
  if (valor !== undefined) updates.valor = valor.trim();
  if (href !== undefined) updates.href = href?.trim() || null;
  if (orden !== undefined) updates.orden = Number(orden) || 0;

  await contacto.update(updates);
  return { ok: true, mensaje: "Contacto actualizado correctamente", contacto };
}

export async function cambiarEstadoContacto(id, activo) {
  const contacto = await contactosCrud.cambiarEstado(id, activo);
  if (!contacto) return { ok: false, codigo: "NO_EXISTE", mensaje: "El contacto no existe" };
  return { ok: true, mensaje: activo ? "Contacto activado correctamente" : "Contacto desactivado correctamente", contacto };
}

export async function eliminarContacto(id) {
  const eliminado = await contactosCrud.eliminar(id);
  if (!eliminado) return { ok: false, codigo: "NO_EXISTE", mensaje: "El contacto no existe" };
  return { ok: true, mensaje: "Contacto eliminado correctamente" };
}

export async function actualizarLayoutArea(id, layout) {
  if (!["grid", "carrusel"].includes(layout))
    return { ok: false, codigo: "VALIDACION", mensaje: "layout debe ser 'grid' o 'carrusel'" };

  const area = await HomeArea.findByPk(id);
  if (!area) return { ok: false, codigo: "NO_EXISTE", mensaje: "El área no existe" };

  await area.update({ layout });
  return { ok: true, mensaje: "Layout actualizado correctamente", area };
}
