CREATE TABLE ped_pedido (
  id             SERIAL PRIMARY KEY,
  -- MPE-09: lo que va en el link de seguimiento. Sin él no se puede ver el pedido.
  clave          VARCHAR(32) NOT NULL,
  -- MPE-04: la elige el navegador al armar el envío; un reintento con la misma no crea otro pedido.
  clave_envio    UUID NOT NULL,
  usuario_id     INTEGER REFERENCES usuario (id),
  estado         VARCHAR(12) NOT NULL DEFAULT 'recibido'
                 CHECK (estado IN ('recibido', 'confirmado', 'listo', 'entregado', 'cancelado')),
  nombre         VARCHAR(80) NOT NULL,
  celular        VARCHAR(20) NOT NULL,
  entrega        VARCHAR(10) NOT NULL CHECK (entrega IN ('retiro', 'envio')),
  direccion      VARCHAR(150),
  localidad      VARCHAR(80),
  nota           VARCHAR(500),
  total          NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  version        INTEGER NOT NULL DEFAULT 1,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ped_pedido_clave_key ON ped_pedido (clave);
CREATE UNIQUE INDEX ped_pedido_clave_envio_key ON ped_pedido (clave_envio);
CREATE INDEX ped_pedido_estado_idx ON ped_pedido (estado, creado_en DESC);
CREATE INDEX ped_pedido_usuario_idx ON ped_pedido (usuario_id) WHERE usuario_id IS NOT NULL;

-- MPE-05: copia de lo que se pidió; si el producto cambia después, el pedido no.
CREATE TABLE ped_item (
  id              SERIAL PRIMARY KEY,
  pedido_id       INTEGER NOT NULL REFERENCES ped_pedido (id) ON DELETE CASCADE,
  variante_id     INTEGER NOT NULL REFERENCES cat_variante (id),
  producto_nombre VARCHAR(120) NOT NULL,
  variante_nombre VARCHAR(60),
  codigo          VARCHAR(40),
  precio          NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  subtotal        NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  orden           SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX ped_item_pedido_idx ON ped_item (pedido_id);

-- MPE-07: cada cambio de estado, con quién y cuándo. No se edita ni se borra.
CREATE TABLE ped_historial (
  id          SERIAL PRIMARY KEY,
  pedido_id   INTEGER NOT NULL REFERENCES ped_pedido (id) ON DELETE CASCADE,
  de          VARCHAR(12),
  a           VARCHAR(12) NOT NULL,
  motivo      VARCHAR(300),
  usuario_id  INTEGER REFERENCES usuario (id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ped_historial_pedido_idx ON ped_historial (pedido_id, id);
