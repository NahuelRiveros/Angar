import { PERMITIDO } from "../../../../../torneo_config.js";

/**
 * Lo que el jugador tiene que hacer con sus inscripciones: responder una invitación o mandar el
 * comprobante. Mismas reglas que el servidor (motivoParaNoSubirComprobante y responderInvitacion).
 * Devuelve [{ id, tipo, titulo, detalle }] en el orden de la lista.
 */
export function avisosDeInscripciones(lista = []) {
  return lista.flatMap((i) => {
    const detalle = [i.torneo?.nombre, i.categoria].filter(Boolean).join(" · ");
    if (i.rol === "invitado" && i.estado === "esperando" && PERMITIDO.anotarseOnline.includes(i.torneo?.estado)) {
      return [{ id: i.id, tipo: "invitacion", titulo: `${i.jugador1_nombre} te invitó a jugar en pareja`, detalle }];
    }
    const debePagar = i.monto_inscripcion && PERMITIDO.pagarInscripcion.includes(i.torneo?.estado)
      && ["esperando", "pendiente"].includes(i.estado) && (i.pago_estado == null || i.pago_estado === "rechazado");
    if (!debePagar) return [];
    return [{
      id: i.id,
      tipo: i.pago_estado === "rechazado" ? "comprobante_rechazado" : "comprobante",
      titulo: i.pago_estado === "rechazado" ? "Te rechazaron el comprobante: mandá otro" : "Falta mandar el comprobante de la inscripción",
      detalle,
    }];
  });
}
