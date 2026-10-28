// Validación de inscripciones sin base de datos (se prueban en ux_rules.test.mjs).
import { normalizarCodigoJugador } from "../common/codigo_jugador.js";

const texto = (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : v);

function nombreJugador(valor, etiqueta) {
  const nombre = texto(valor);
  if (typeof nombre !== "string" || nombre.length < 3 || nombre.length > 80) return { error: `${etiqueta}: escribí nombre y apellido (entre 3 y 80 caracteres).` };
  return { valor: nombre };
}

function opcionales(b) {
  const telefono = texto(b.telefono);
  if (telefono && (typeof telefono !== "string" || !/^[0-9+()\s-]{6,40}$/.test(telefono))) return { error: "El teléfono solo puede tener números, espacios, +, - y paréntesis." };
  const nota = texto(b.nota);
  if (nota && (typeof nota !== "string" || nota.length > 300)) return { error: "La nota puede tener hasta 300 caracteres." };
  return { datos: { telefono: telefono || null, nota: nota || null } };
}

const idValido = (v) => Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) <= 2147483647;

/**
 * El jugador logueado es el jugador 1 (su nombre sale de la cuenta). Al compañero lo indica
 * por nombre (no tiene cuenta) o por su código de jugador (se lo invita y tiene que aceptar).
 */
export function validarInscripcionOnline(body) {
  const b = body ?? {};
  if (!idValido(b.categoria_id)) return { error: "Elegí la categoría." };
  const extra = opcionales(b);
  if (extra.error) return extra;
  if (b.codigo_companiero != null && b.codigo_companiero !== "") {
    const codigo = normalizarCodigoJugador(b.codigo_companiero);
    if (!codigo) return { error: "El código de tu compañero tiene la forma MP-XXXXX (lo ve en su perfil)." };
    return { datos: { categoria_id: Number(b.categoria_id), codigo_companiero: codigo, ...extra.datos } };
  }
  const companiero = nombreJugador(b.jugador2_nombre, "Tu compañero");
  if (companiero.error) return companiero;
  return { datos: { categoria_id: Number(b.categoria_id), jugador2_nombre: companiero.valor, ...extra.datos } };
}

/** Pareja cargada (o editada) por el organizador. Al editar no se cambia la categoría. */
export function validarParejaOrganizador(body, { editar = false } = {}) {
  const b = body ?? {};
  if (!editar && !idValido(b.categoria_id)) return { error: "Elegí la categoría." };
  const uno = nombreJugador(b.jugador1_nombre, "Jugador 1");
  if (uno.error) return uno;
  const dos = nombreJugador(b.jugador2_nombre, "Jugador 2");
  if (dos.error) return dos;
  const extra = opcionales(b);
  if (extra.error) return extra;
  return {
    datos: {
      ...(editar ? {} : { categoria_id: Number(b.categoria_id) }),
      jugador1_nombre: uno.valor, jugador2_nombre: dos.valor, ...extra.datos,
      cabeza_de_serie: b.cabeza_de_serie === true,
    },
  };
}
