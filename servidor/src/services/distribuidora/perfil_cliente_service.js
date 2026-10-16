import { sequelize } from "../../database/sequelize.js";
import { PerfilClienteDistribuidora, Persona, Usuario } from "../../models/index.js";
import { datosClienteCompletos } from "../common/datos_cliente.js";

const CAMPOS_PERFIL = ["cuit", "razon_social", "condicion_iva", "direccion", "provincia", "departamento", "localidad", "codigo_postal"];

/**
 * Datos del cliente para pedir: nombre, apellido y celular (de persona) más
 * facturación y entrega (perfil). `completo` dice si ya puede enviar un pedido;
 * es la misma regla que aplica crearNotaPedido (ver services/common/datos_cliente.js).
 */
export async function obtenerPerfil(usuario_id) {
  const [usuario, perfil] = await Promise.all([
    Usuario.findByPk(usuario_id, { attributes: ["id"], include: [{ model: Persona, as: "persona", attributes: ["nombre", "apellido", "celular"] }] }),
    PerfilClienteDistribuidora.findOne({ where: { usuario_id } }),
  ]);
  const datos = {
    nombre: usuario?.persona?.nombre ?? "",
    apellido: usuario?.persona?.apellido ?? "",
    celular: usuario?.persona?.celular ?? "",
    ...Object.fromEntries(CAMPOS_PERFIL.map((campo) => [campo, perfil?.[campo] ?? null])),
  };
  return { ...datos, completo: datosClienteCompletos(datos) };
}

export function perfilCompleto(perfil) {
  return datosClienteCompletos(perfil);
}

/** Recibe datos ya validados con validarDatosCliente(). Persona y perfil se guardan juntos o no se guarda nada. */
export async function guardarPerfil(usuario_id, { nombre, apellido, celular, ...perfil }) {
  await sequelize.transaction(async (transaction) => {
    const usuario = await Usuario.findByPk(usuario_id, { attributes: ["id", "persona_id"], transaction });
    await Persona.update({ nombre, apellido, celular, actualizado_en: new Date() }, { where: { id: usuario.persona_id }, transaction });
    const [fila] = await PerfilClienteDistribuidora.findOrCreate({ where: { usuario_id }, defaults: { usuario_id, ...perfil }, transaction });
    await fila.update({ ...perfil, fecha_mod: new Date() }, { transaction });
  });
  return obtenerPerfil(usuario_id);
}
