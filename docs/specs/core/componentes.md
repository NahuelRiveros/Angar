# Kit de componentes del core (`KIT`)

## Objetivo

Que toda pantalla nueva (de un módulo del core o del rubro de un proyecto) se arme con las mismas piezas, en
vez de copiar botones, buscadores o estados con clases escritas a mano. Así se ven parejas, funcionan igual en
el celular y un estilo nuevo (ver `estilos.md`, próximo paso) cambia el aspecto de todas a la vez.

Regla para código nuevo: **si la pieza está acá, se usa esta**. Si falta algo que sirve a dos o más proyectos,
se agrega al kit; si es de un solo negocio, queda en su rubro.

## Dónde está

- Componentes: `frontend/src/core/controls/ui/`
- Funciones: `frontend/src/core/utils/` (`dinero.js`, `whatsapp.js`, `errores.js`, `formatear_fecha.js`)
- Hooks: `frontend/src/core/hooks/` (`use_filtros_url.js`)

## Las piezas

### Formularios

| Pieza | Para qué | Ejemplo |
| --- | --- | --- |
| `Formulario` | Sobre React Hook Form: un envío a la vez, errores del servidor en su campo, error general y botones Guardar / Cancelar. `barra`: botones fijos abajo (pantallas largas), sin tapar campos. | `<Formulario form={form} onEnviar={guardar} textoGuardar="Guardar producto" cancelar="/admin/catalogo/productos" barra>…campos…</Formulario>` |
| `BarraAcciones` (`formulario.jsx`) | La barra fija sola, para pantallas con botones propios. | `<BarraAcciones resumen="3 talles · 2 fotos">…botones…</BarraAcciones>` |
| `ConfirmarConMotivo` | Confirmar algo que pide motivo (cancelar, volver atrás, reabrir). | `<ConfirmarConMotivo titulo="Cancelar pedido #7" textoConfirmar="Cancelar pedido" peligro onConfirmar={(motivo) => …} onClose={…} />` |

### Botones y campos

| Pieza | Para qué | Ejemplo |
| --- | --- | --- |
| `ActionButton` | Botón. `variante`: principal (por defecto), secundario, peligro, compra, whatsapp. `tamano`: normal o grande. `to`: se muestra como link. `cargando`: se deshabilita y gira el ícono. | `<ActionButton variante="peligro" onClick={…}>Cancelar pedido</ActionButton>` · `<ActionButton to="/admin/x/nuevo">Nuevo</ActionButton>` |
| `estilos.js` → `claseBoton(variante, tamano)`, `BOTON_PRIMARIO`, `BOTON_SECUNDARIO`, `BOTON_PELIGRO`, `BOTON_COMPRA`, `BOTON_WHATSAPP` | Las mismas clases para un `<Link>` o `<a>` con forma de botón. | `<Link to="/carrito" className={BOTON_SECUNDARIO}>Ver carrito</Link>` |
| `estilos.js` → `CAMPO` | Un `<select>` o `<input>` suelto (filtros). En un formulario, mejor los de abajo. | `<select className={CAMPO}>` |
| `InputField`, `SelectField`, `TextareaField`, `ComboboxField` | Campos de formulario con etiqueta, ayuda y error, para React Hook Form (`register`). | `<InputField label="Nombre" name="nombre" register={register} error={errors.nombre?.message} />` |
| `Casilla` (`pantalla_panel.jsx`) | Casilla con su texto y ayuda. | `<Casilla name="activo" register={register} label="Se ve en la web" />` |
| `QuantityInput` | Cantidad con − y +. | `<QuantityInput value={n} onChange={setN} max={99} />` |
| `ImageUploadField` | Subir una foto (Cloudinary) o pegar su dirección. | |
| `SelectorOpciones` | Botones para elegir una opción o varias (`multiple`): talles, colores, opciones de un producto. `tachada`: se marca (ej. sin stock). | `<SelectorOpciones etiqueta="Talles" opciones={[{ valor: "M", texto: "M" }]} valor={talle} onCambiar={setTalle} />` |
| `SearchField` | Buscador que espera a que se deje de escribir. | `<SearchField value={filtros.q ?? ""} onSearch={(q) => cambiar({ q })} label="Buscar pedidos" />` |
| `FormError` | El error general de un formulario (arriba del botón). | `<FormError message={errors.root?.message} />` |

### Estados de una consulta (cargando, error, vacío)

| Pieza | Dónde | Ejemplo |
| --- | --- | --- |
| `SegunConsulta` (`pantalla_panel.jsx`) | Panel: cargando, error con reintentar o vacío; si hay datos, muestra lo de adentro. | `<SegunConsulta consulta={consulta} vacia={!items.length} icono={Package} tituloVacio="Todavía no hay productos">{() => …}</SegunConsulta>` |
| `Cargando`, `ErrorReintentar` (`estados_web.jsx`) | Web pública: esqueleto de carga y error con "Reintentar". | `<ErrorReintentar consulta={consulta} mensaje="No pudimos cargar tu pedido." />` |
| `AdminSpinner`, `AdminEmptyState`, `ErrorBanner` | Las piezas sueltas que usa `SegunConsulta`. | |

### Estructura del panel

| Pieza | Para qué |
| --- | --- |
| `Pantalla`, `Encabezado`, `Tarjeta` (`pantalla_panel.jsx`) | Fondo y ancho de una pantalla del panel, su título con botones, y cada sección en tarjeta. |
| `Modal`, `ConfirmDialog` | Ventana con formulario; confirmación de algo que no se deshace. |
| `Pestanas` | Filtros de un listado con su cantidad; en el celular se desplazan de costado. |
| `Lista`, `FilaLista` (`fila_lista.jsx`) | La lista del panel y cada fila: foto o ícono, título, datos, etiquetas y, a la derecha, un valor o acciones. Con `to`, toda la fila es un link. |
| `Pagination`, `DataGrid` | Páginas de un listado; tabla con columnas. |
| `AyudaTooltip` | La "i" con una explicación corta. |

### Datos que se muestran

| Pieza | Para qué | Ejemplo |
| --- | --- | --- |
| `Etiqueta` | Estado con color por significado. `tono`: neutro, info, exito, aviso, peligro, destacado. | `<Etiqueta tono="peligro">Agotado</Etiqueta>` |
| `Precio` | Precio con el anterior tachado; sin precio, "Consultar precio". `tamano`: chico, normal, grande. | `<Precio monto={v.precio} anterior={v.precio_anterior} tamano="grande" />` |
| `Pasos` | En qué paso va algo (pedido, turno) y cuándo llegó a cada uno. | `<Pasos pasos={[{ clave: "recibido", texto: "Recibido" }, …]} actual="confirmado" fechas={…} />` |
| `formatearPrecio`, `tienePrecio` (`utils/dinero.js`) | "$ 15.000" o "$ 15.000,50". | |
| `formatearFechaAR`, `formatearFechaHora` (`utils/formatear_fecha.js`) | "25/11/2026" y "25/11, 10:30 p. m.". | |
| `linkWhatsapp` (`utils/whatsapp.js`) | Link de WhatsApp con el mensaje escrito. | `linkWhatsapp(clientConfig.whatsapp, "Hola…")` |
| `mensajeError`, `mostrarErrores` (`utils/errores.js`) | El mensaje del servidor; cada error en su campo del formulario. | |
| `useFiltrosUrl` (`hooks/use_filtros_url.js`) | Filtros guardados en la dirección (se comparten y sobreviven a "atrás"). | `const { filtros, cambiar } = useFiltrosUrl(["q", "estado"])` |

## Reglas

| Código | Regla | Estado |
| --- | --- | --- |
| KIT-01 | Los módulos del core (catálogo, pedidos, stock) usan solo piezas del kit; no tienen carpeta `comun/` propia. | ✅ |
| KIT-02 | `ActionButton` sin `variante` se ve igual que antes del kit: los proyectos actuales no cambian. | ✅ comprobado clase por clase |
| KIT-03 | Botones: base, tamaño y variante no repiten propiedades de Tailwind (sin clases que compitan). | ✅ |
| KIT-04 | Un componente del kit no se borra mientras algún proyecto lo use (antes de borrar, revisar los proyectos). | ✅ (se borró solo `tree_view`, sin uso) |
| KIT-06 | Formularios, listados, filtros con cantidad, selección de opciones, confirmación con motivo y pasos usan `Formulario`, `FilaLista`, `Pestanas`, `SelectorOpciones`, `ConfirmarConMotivo` y `Pasos` (catálogo, pedidos y stock ya los usan). | ✅ |
| KIT-05 | Un test frena colores y botones escritos a mano en pantallas nuevas. | 🚧 con los estilos (`estilos.md`) |

Los proyectos actuales (DistribuCG, MiPadel, Stilos, gissiMoto) conservan sus piezas propias: pasarlos al kit es
opcional y de a uno.
