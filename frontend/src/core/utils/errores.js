/** El mensaje en español que manda el servidor, o uno genérico. */
export const mensajeError = (error, porDefecto) => error?.response?.data?.mensaje ?? porDefecto;

/** Pone cada error del servidor en su campo (React Hook Form); lo que no es de un campo, arriba del botón. */
export function mostrarErrores(error, setError, porDefecto) {
  const porCampo = error?.response?.data?.errores ?? [];
  porCampo.forEach((e, i) => setError(e.campo || "root", { message: e.mensaje }, { shouldFocus: i === 0 }));
  if (!porCampo.length) setError("root", { message: mensajeError(error, porDefecto) });
}
