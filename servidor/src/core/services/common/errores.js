/**
 * Error esperado del negocio ("ese banner no existe", "llegaste al tope"). Un service lo lanza y
 * el manejador central de app.js lo convierte en { ok: false, codigo, mensaje } con su estado
 * HTTP. Así los controllers no repiten try/catch ni deciden códigos HTTP a mano.
 */
export class ErrorApp extends Error {
  constructor(codigo, mensaje, estado = 400) {
    super(mensaje);
    this.name = "ErrorApp";
    this.codigo = codigo;
    this.estado = estado;
  }
}

export const noExiste = (mensaje) => new ErrorApp("NO_EXISTE", mensaje, 404);
