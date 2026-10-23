// Datos que hacen falta para enviar un pedido: quién es (nombre, apellido, celular,
// guardados en persona) y a quién se factura y dónde se entrega (perfil del cliente).
// No se piden al registrarse: cuentas de Google pueden llegar sin apellido.
import { normalizarDocumento, problemaFiscal } from "../../../../fiscal_config.js";

const CELULAR_REGEX = /^[0-9+\-\s()]+$/;

export function celularValido(valor) {
  const texto = String(valor ?? "").trim();
  const digitos = texto.replace(/\D/g, "").length;
  return CELULAR_REGEX.test(texto) && digitos >= 8 && digitos <= 15;
}

export function datosClienteCompletos(datos) {
  return !!(
    datos?.nombre?.trim() && datos?.apellido?.trim() && celularValido(datos?.celular) &&
    !problemaFiscal(datos ?? {}) && datos?.direccion && datos?.provincia && datos?.localidad
  );
}

const texto = (v) => String(v ?? "").trim();
const opcional = (v) => texto(v) || null;

/** Limpia y valida lo que manda el formulario. Devuelve { datos } o { error }. */
export function validarDatosCliente(body = {}) {
  const datos = {
    nombre: texto(body.nombre), apellido: texto(body.apellido), celular: texto(body.celular),
    cuit: normalizarDocumento(body.cuit), razon_social: opcional(body.razon_social), condicion_iva: opcional(body.condicion_iva),
    direccion: texto(body.direccion), provincia: texto(body.provincia), departamento: opcional(body.departamento),
    localidad: texto(body.localidad), codigo_postal: opcional(body.codigo_postal),
  };
  if (!datos.nombre || !datos.apellido) return { error: "Completá tu nombre y apellido." };
  if (datos.nombre.length > 100 || datos.apellido.length > 100) return { error: "El nombre y el apellido pueden tener hasta 100 caracteres." };
  if (!celularValido(datos.celular)) return { error: "Ingresá un celular válido, con código de área (ej: 11 2345-6789)." };
  const fiscal = problemaFiscal(datos);
  if (fiscal) return { error: fiscal };
  if (datos.razon_social && datos.razon_social.length > 150) return { error: "La razón social puede tener hasta 150 caracteres." };
  if (!datos.direccion || !datos.provincia || !datos.localidad) return { error: "Completá dirección, provincia y localidad." };
  return { datos };
}
