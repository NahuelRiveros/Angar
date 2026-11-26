-- MST-01: una variante controla stock si tiene su fila acá; si no, vale su "disponible" del catálogo.
CREATE TABLE stk_existencia (
  variante_id    INTEGER PRIMARY KEY REFERENCES cat_variante (id),
  cantidad       INTEGER NOT NULL CHECK (cantidad >= 0),
  minimo         INTEGER NOT NULL DEFAULT 0 CHECK (minimo >= 0),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MST-02: la cantidad solo cambia con un movimiento. `cantidad` lleva el signo; `saldo`, cómo quedó.
CREATE TABLE stk_movimiento (
  id          SERIAL PRIMARY KEY,
  variante_id INTEGER NOT NULL REFERENCES cat_variante (id),
  tipo        VARCHAR(12) NOT NULL CHECK (tipo IN ('inicio', 'entrada', 'salida', 'ajuste', 'pedido', 'devolucion')),
  cantidad    INTEGER NOT NULL,
  saldo       INTEGER NOT NULL CHECK (saldo >= 0),
  motivo      VARCHAR(200),
  -- Sin clave foránea: stock funciona aunque el módulo pedidos esté apagado.
  pedido_id   INTEGER,
  usuario_id  INTEGER REFERENCES usuario (id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stk_movimiento_variante_idx ON stk_movimiento (variante_id, id DESC);
CREATE INDEX stk_movimiento_pedido_idx ON stk_movimiento (pedido_id) WHERE pedido_id IS NOT NULL;

-- MST-02: un movimiento no se edita ni se borra, tampoco desde fuera del sistema.
CREATE FUNCTION stk_movimiento_fijo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de stock no se editan ni se borran.';
END;
$$;
CREATE TRIGGER stk_movimiento_fijo BEFORE UPDATE OR DELETE ON stk_movimiento FOR EACH ROW EXECUTE FUNCTION stk_movimiento_fijo();
