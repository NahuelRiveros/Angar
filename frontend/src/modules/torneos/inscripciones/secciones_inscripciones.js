import { avisosDeInscripciones } from "../avisos/avisos_inscripciones.js";

// Pestañas de "Mis inscripciones": lo vigente primero; lo jugado y las bajas quedan aparte para
// que no se acumulen a la vista.
export const SECCIONES = [
  ["activas", "Activas"],
  ["jugadas", "Jugadas"],
  // Incluye las rechazadas y los torneos cancelados; el nombre corto entra en el celular.
  ["bajas", "Bajas"],
];

const VIVAS = ["esperando", "pendiente", "confirmada"];

/** En qué pestaña va cada inscripción. */
export function seccionDe(i) {
  if (!VIVAS.includes(i.estado) || i.torneo?.estado === "cancelado") return "bajas";
  if (i.torneo?.estado === "finalizado") return "jugadas";
  return "activas";
}

/**
 * Qué sigue con esta inscripción, en una línea, y si le toca hacer algo al jugador.
 * { texto, accion } — accion true = tiene que hacer algo él (pagar o responder).
 */
export function proximoPaso(i) {
  const [aviso] = avisosDeInscripciones([i]);
  if (aviso?.tipo === "invitacion") return { texto: "Respondé la invitación de tu compañero.", accion: true };
  if (aviso?.tipo === "comprobante") return { texto: "Mandá el comprobante para confirmar tu lugar.", accion: true };
  if (aviso?.tipo === "comprobante_rechazado") return { texto: "Mandá otro comprobante: el anterior fue rechazado.", accion: true };
  if (i.estado === "esperando") return { texto: `Esperando que ${i.jugador2_nombre} acepte la invitación.`, accion: false };
  if (i.estado === "pendiente") {
    return { texto: i.pago_estado === "en_revision" ? "La organización está revisando tu comprobante." : "Esperando que la organización confirme tu inscripción.", accion: false };
  }
  if (i.estado === "confirmada") {
    if (i.torneo?.estado === "en_juego") return { texto: "Torneo en juego: mirá tus zonas, horarios y resultados.", accion: false };
    if (i.torneo?.estado === "finalizado") return { texto: "Torneo terminado: mirá cómo salió.", accion: false };
    return { texto: "Confirmada: ya tenés tu lugar.", accion: false };
  }
  if (i.torneo?.estado === "cancelado") return { texto: "El torneo se canceló.", accion: false };
  return { texto: i.estado === "rechazada" ? "La organización rechazó la inscripción." : "Te diste de baja.", accion: false };
}

const PRIORIDAD = { esperando: 1, pendiente: 1, confirmada: 2 };

/** Lo que pide acción arriba; después lo pendiente; al final lo confirmado. Dentro, por fecha del torneo. */
export function ordenarInscripciones(lista) {
  const peso = (i) => (proximoPaso(i).accion ? 0 : PRIORIDAD[i.estado] ?? 3);
  return [...lista].sort((a, b) => peso(a) - peso(b) || String(a.torneo?.fecha_inicio ?? "9999").localeCompare(String(b.torneo?.fecha_inicio ?? "9999")));
}
