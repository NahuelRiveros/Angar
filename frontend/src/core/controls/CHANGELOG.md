# Changelog de `controls/`

Kit reusable entre proyectos (gym, venta online, stock, etc.): primitivas de
UI, layout (navbar/footer/app_layout), marca/theming, guard de rutas por rol
y el sistema de suscripción/módulos habilitados.

**Cómo portar una mejora a otro proyecto:** copiá el/los archivo(s) que
cambiaron, subí `CONTROLS_VERSION` en `version.js` acorde (patch = fix sin
romper nada, minor = agregado compatible, major = cambia una firma/prop que
los consumidores tienen que ajustar) y anotá acá qué cambió. Antes de pisar
un archivo en otro proyecto, revisá si ese proyecto le hizo cambios propios
al mismo archivo — si los tiene, es un merge manual, no un copy-paste.

## 2.2.0 — 2026-11-17

Puntos de extensión para conectar proyectos sin tienda (MiPadel). Compatibles: sin configurar nada, todo sigue igual.

- `core/permisos_config.js`: lee el opcional `ROLES_DE_RUBROS` de `proyecto/permisos_rubros.js` (PER-37):
  roles propios sin permisos (`fuera`) y `rolAlRegistrarse`. El registro y Google usan ese rol (USU-14).
- `layout/panel/panel_usuario`: no muestra como rol del equipo ningún rol "fuera" (antes solo `cliente`).
- `config/auth_config`: `destinoTrasRegistro` sale de `registro.destino` del `modulo.js` de un rubro (USU-43).
- `core/suscripcion_software_config.js`: `suscripcionDelSoftware: false` en `proyecto/client_config.js` apaga
  la suscripción del software: sin bloqueo, rutas, plan inicial, aviso ni pantallas (SIS-56).

## 2.1.0 — 2026-11-17

Diseño del marco tomado de MiPadel (spec `docs/specs/core/sistema.md`, SIS-53 a SIS-55). Compatible:
un proyecto que no configura nada nuevo sigue andando, con el diseño nuevo y textos neutros.

- `layout/navbar`: menú en píldora, barra más alta, "Ingresar ↗" y el menú de celular desde 1024 px
  (antes 1280). `navbar_link` muestra el ícono del ítem si lo tiene.
- `layout/navbar_mobile`: menú lateral con la marca, tarjeta para ingresar o crear cuenta y frases del
  proyecto en `brandConfig.menuMovil` (`lema`, `titulo`, `texto`, `pie`; todas opcionales).
- `brand/logo_moovs`: nuevo `logo.tipo` "simbolo-y-texto" (símbolo + nombre con `acento`). El pie no
  repite el nombre cuando el logo ya lo muestra.
- `layout/app_layout`: al imprimir solo sale el contenido (sin cinta, barra, aviso ni pie).
- `layout/panel/panel_layout`: "Ver tienda" si hay tienda; si no, "Ver sitio".
- `app/routes/general.routes`: la portada la puede poner el rubro (`inicio` en sus pantallas, `app/inicio.js`).
## 2.0.0 — 2026-11-10

Home de tienda con banners programables (spec `docs/specs/cambios/2026-11-home-tienda.md`).

- `layout/anuncios_banner`: lee la cinta de `/api/banners` (tipo `cinta`) y acepta enlace.
- `layout/footer`: los contactos salen solo de `home_config.js` (`HOME_CONTACTOS`); el bloque de
  ayuda tiene `id="contacto"`, a donde llevan "Contacto" y el botón de arrepentimiento.
- Se quitó `ui/icono_picker` (era del home editable) y `ICONOS_HOME_NOMBRES`.
- **Rompe:** `InicioTienda` de un rubro ahora recibe solo `textos` (`HOME_TIENDA`), ya no `texto()`.
- Se quitó el interruptor de módulos (`config/modulos_config`, `modulosHabilitados` en la sesión y
  `modulo:` en los ítems del menú y del pie): qué rubros existen lo decide solo `gate_config.js`.

## 1.0.0 — 2026-08-31

Extracción inicial desde el proyecto Moovs (gym + kinesiología), limpiado de
todo lo específico de ese rubro.

- `ui/`: confirm_dialog, data_grid, error_banner, error_boundary, form_error,
  input_field, select_field, submit_button, textarea_field.
- `layout/`: app_layout, footer, navbar/ (navbar, desktop, mobile, dropdown,
  userbox, permissions, estilos).
- `brand/`: logo_moovs (componente de logo — el SVG y los colores sí son por
  cliente, ver `config/brand_config.js`).
- `acceso/`: protected_route (guard de rutas por rol).
- `suscripcion/` + `sistema/`: banner de suscripción del sistema y banner de
  servidor caído — pensados para reusarse en cualquier proyecto que quiera el
  mismo esquema de licenciamiento/módulos habilitados.
- `modales/`: welcome_modal (genérico) y staff_form_modal / staff_password_modal
  (gestión de usuarios con rol — staff/admin).
- `config/`: apply_brand_theme, modulos_config, home_iconos — mecanismos, no
  contenido. El contenido por-proyecto vive en `src/config/` (fuera de
  `controls/`), no acá.
