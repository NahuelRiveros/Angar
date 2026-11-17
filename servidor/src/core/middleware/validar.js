/**
 * Valida la entrada con esquemas Zod antes de llegar al controller. Lo validado (ya limpio y
 * convertido) queda en req.datos = { body, params, query }; nunca se usa req.body crudo.
 * Si algo no cumple, responde 400 con el primer error en español y la lista por campo.
 */
export function validar(esquemas) {
  return (req, res, next) => {
    req.datos = {};
    for (const [parte, esquema] of Object.entries(esquemas)) {
      const resultado = esquema.safeParse(req[parte] ?? {});
      if (!resultado.success) {
        const errores = resultado.error.issues.map((issue) => ({ campo: issue.path.join("."), mensaje: issue.message }));
        return res.status(400).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: errores[0].mensaje, errores });
      }
      req.datos[parte] = resultado.data;
    }
    return next();
  };
}
