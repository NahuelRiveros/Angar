CREATE TABLE cat_categoria (
  id             SERIAL PRIMARY KEY,
  padre_id       INTEGER REFERENCES cat_categoria (id),
  nombre         VARCHAR(60) NOT NULL,
  slug           VARCHAR(90) NOT NULL,
  orden          SMALLINT NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cat_categoria_slug_key ON cat_categoria (slug);
-- El nombre no se repite dentro del mismo nivel ("Cascos" puede estar en dos categorías distintas).
CREATE UNIQUE INDEX cat_categoria_nombre_key ON cat_categoria (COALESCE(padre_id, 0), lower(nombre));

CREATE TABLE cat_producto (
  id             SERIAL PRIMARY KEY,
  categoria_id   INTEGER NOT NULL REFERENCES cat_categoria (id),
  nombre         VARCHAR(120) NOT NULL,
  slug           VARCHAR(90) NOT NULL,
  descripcion    TEXT,
  destacado      BOOLEAN NOT NULL DEFAULT FALSE,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  version        INTEGER NOT NULL DEFAULT 1,
  eliminado_en   TIMESTAMPTZ,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cat_producto_slug_key ON cat_producto (slug);
CREATE INDEX cat_producto_categoria_idx ON cat_producto (categoria_id);

CREATE TABLE cat_variante (
  id              SERIAL PRIMARY KEY,
  producto_id     INTEGER NOT NULL REFERENCES cat_producto (id) ON DELETE CASCADE,
  nombre          VARCHAR(60),
  codigo          VARCHAR(40),
  precio          NUMERIC(12, 2) CHECK (precio >= 0),
  precio_anterior NUMERIC(12, 2) CHECK (precio_anterior >= 0),
  disponible      BOOLEAN NOT NULL DEFAULT TRUE,
  orden           SMALLINT NOT NULL DEFAULT 0,
  eliminado_en    TIMESTAMPTZ
);
CREATE INDEX cat_variante_producto_idx ON cat_variante (producto_id);

CREATE TABLE cat_foto (
  id          SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES cat_producto (id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  orden       SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX cat_foto_producto_idx ON cat_foto (producto_id);
