// Las dos formas de responder de un controller (ficha: docs/specs/core/servidor.md). Sin try/catch: Express 5
// lleva cualquier error al manejador central (app.js), que responde en español con su código.
// `hacer(datos, usuario, req)`: `datos` es lo validado por validar() ({ body, params, query }), `usuario`
// el de la sesión (o undefined en rutas públicas).

/** Devuelve lo que trae `hacer`: { ok: true, data }. */
export const datos = (hacer) => async (req, res) => {
  res.json({ ok: true, data: await hacer(req.datos ?? {}, req.user, req) });
};

/** Hace algo y lo confirma: { ok: true, codigo, mensaje, data? }. `estado`: 201 al crear. */
export const hecho = (codigo, mensaje, hacer, estado = 200) => async (req, res) => {
  const data = await hacer(req.datos ?? {}, req.user, req);
  res.status(estado).json({ ok: true, codigo, mensaje, ...(data !== undefined && { data }) });
};
