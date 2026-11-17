// ─────────────────────────────────────────────────────────────────────────────
// PALETA DE ACENTO — cambiá solo aquí para re-colorear toda la navbar
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  // Links / botones ACTIVOS (página actual, item seleccionado)
  activo_bg:       "bg-(--kt-teal-700)",
  activo_texto:    "text-white",
  activo_sombra:   "shadow-[var(--kt-turquoise)]/25",

  // HOVER sobre links inactivos (nav desktop, items dropdown, mobile)
  hover_bg:        "hover:bg-[var(--kt-turquoise-soft)]",
  hover_texto:     "hover:text-[var(--kt-petrol)]",

  // Estado "abierto" suave (dropdown trigger, accordion mobile abierto)
  suave_bg:        "bg-[var(--kt-turquoise-soft)]",
  suave_texto:     "text-[var(--kt-petrol)]",
  suave_bg_t:      "bg-[var(--kt-turquoise-soft)]/60",

  // Hover oscuro para botones sólidos (btn login, mobile_btn_login)
  btn_hover:       "hover:bg-[var(--kt-petrol)]",

  // Iconos en estado activo / abierto
  icono_bg:        "bg-[var(--kt-turquoise-soft)]",
  icono_texto:     "text-[var(--kt-petrol)]",
  icono_texto_sm:  "text-(--kt-teal-700)",

  // Bordes y sombras de acento
  borde_acento:    "border-[var(--kt-turquoise-border)]",
  borde_acento_t:  "border-[var(--kt-turquoise-border)]/60",
  sombra_acento:   "shadow-[var(--kt-turquoise)]/8",

  // Textos de acento
  texto_acento:    "text-(--kt-teal-700)",

  // Gradiente cabecera de paneles dropdown
  grad_header:     "from-slate-50 to-[var(--kt-turquoise-soft)]/50",

  // Focus ring
  foco_ring:       "focus-visible:ring-(--kt-teal-700)",
};
// ─────────────────────────────────────────────────────────────────────────────

export const UI_NAVBAR = {

  // ════════════════════════════════════════════════════════════════
  // BARRA PRINCIPAL — el mismo <header> sirve para desktop Y mobile
  // ════════════════════════════════════════════════════════════════

  barra_header:                                            // ← bg de toda la barra (ambos tamaños)
    "sticky top-0 z-30 border-b border-(--kt-border)/70 bg-white/95 shadow-[0_4px_24px_-16px_rgba(7,61,43,0.25)] backdrop-blur-xl",
  barra_header_con_sombra:
    "shadow-lg shadow-slate-900/8",

  barra_linea_acento:
    "absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-(--kt-teal-500)/25 to-transparent",

  barra_nav_container:
    "mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:h-[88px] lg:px-8",

  // ════════════════════════════════════════════════════════════════
  // BRAND / LOGO
  // ════════════════════════════════════════════════════════════════

  brand_link:
    `group flex shrink-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 ${C.foco_ring} focus-visible:ring-offset-2`,

  brand_textos:
    "hidden leading-tight sm:block",

  brand_titulo:
    "kt-display text-base font-bold tracking-tight text-slate-900",

  brand_subtitulo:
    "text-[11px] font-medium text-(--kt-ink-mute)",

  // ════════════════════════════════════════════════════════════════
  // BOTONES DE ACCIÓN — BARRA
  // ════════════════════════════════════════════════════════════════

  btn_login_desktop:
    `inline-flex min-h-11 items-center gap-4 rounded-full bg-(--kt-night) px-5 py-2.5 text-sm font-bold text-white transition hover:bg-(--kt-teal-700) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--kt-teal-700)`,

  btn_hamburguesa:
    `inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border border-(--kt-border) bg-(--kt-bg-soft) px-2.5 text-sm font-bold text-(--kt-night) transition hover:bg-(--kt-turquoise-soft) focus-visible:outline-none focus-visible:ring-2 ${C.foco_ring} focus-visible:ring-offset-2`,

  // ════════════════════════════════════════════════════════════════
  // NAVEGACIÓN DESKTOP (navbar_desktop.jsx)
  // ════════════════════════════════════════════════════════════════

  desktop_contenedor:                                      // ← scroll horizontal si no entran todos los menús (evita que se encimen con logo/userbox)
    "mx-auto hidden min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-(--kt-border)/60 bg-(--kt-bg-soft)/80 p-1.5 lg:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",

  desktop_link:
    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--kt-teal-500)",

  desktop_link_activo:                                     // ← C.activo_bg
    `bg-(--kt-night) text-white shadow-sm`,

  desktop_link_inactivo:                                   // ← C.hover_bg / C.hover_texto
    `text-slate-600 ${C.hover_bg} ${C.hover_texto}`,

  // ════════════════════════════════════════════════════════════════
  // DROPDOWN DESKTOP (navbar_dropdown.jsx)
  // ════════════════════════════════════════════════════════════════

  dropdown_trigger:
    `inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${C.foco_ring} focus-visible:ring-offset-2`,

  dropdown_trigger_abierto:
    `${C.suave_bg} ${C.suave_texto}`,

  dropdown_trigger_cerrado:
    `text-slate-600 ${C.hover_bg} ${C.hover_texto}`,

  dropdown_chevron:
    "shrink-0 transition-transform duration-200",
  dropdown_chevron_abierto:
    "rotate-180",

  // Posición (fixed + top/left/right) se calcula en JS y se aplica inline —
  // el panel se porta a document.body para no quedar recortado por el
  // overflow-x-auto de desktop_contenedor (ver navbar_dropdown.jsx).
  dropdown_panel:
    "fixed z-[var(--z-modal)] max-h-[calc(100dvh-100px)] overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5 w-72",
  dropdown_panel_ancho:
    "fixed z-[var(--z-modal)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5 min-w-150",
  // Estados compartidos de entrada/salida para paneles flotantes (userbox)
  panel_flotante_abierto:
    "scale-100 opacity-100",
  panel_flotante_cerrado:
    "pointer-events-none scale-95 opacity-0",

  dropdown_cabecera:
    `flex items-center gap-2.5 border-b border-slate-100 bg-linear-to-r ${C.grad_header} px-4 py-2.5`,

  dropdown_cabecera_icono:
    `flex h-6 w-6 items-center justify-center rounded-lg ${C.icono_bg} ${C.icono_texto}`,

  dropdown_cabecera_label:
    "text-[11px] font-black uppercase tracking-widest text-slate-500",

  dropdown_columnas:
    "grid grid-cols-3 divide-x divide-slate-100",
  dropdown_columna:
    "p-3",
  dropdown_columna_grupo_cabecera:
    "mb-2 flex items-center gap-1.5 px-1 py-0.5",
  dropdown_columna_grupo_icono:
    `flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${C.suave_bg} ${C.icono_texto_sm}`,

  dropdown_lista:
    "p-2",
  dropdown_grupo_cabecera:
    "mx-1 mb-0.5 mt-2 flex items-center gap-2 px-2 py-1 first:mt-0",
  dropdown_grupo_icono:
    "flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500",
  dropdown_grupo_divisor:
    "mx-3 mt-1.5 border-b border-slate-100 last:hidden",

  // ════════════════════════════════════════════════════════════════
  // ITEMS (compartidos dropdown desktop + mobile)
  // ════════════════════════════════════════════════════════════════

  item_grupo_label:
    "text-[10px] font-black uppercase tracking-widest text-slate-500",
  item_lista:
    "space-y-0.5",

  item_link:
    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150",

  item_link_activo:
    `${C.activo_bg} ${C.activo_texto} shadow-sm ${C.activo_sombra}`,

  item_link_inactivo:
    `text-slate-600 ${C.hover_bg} ${C.hover_texto}`,

  item_icono:
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500",

  item_link_ancho:
    "flex items-start gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all duration-150",
  item_icono_ancho:
    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500",

  // ════════════════════════════════════════════════════════════════
  // MENÚ MOBILE (navbar_mobile.jsx)
  // ════════════════════════════════════════════════════════════════

  mobile_overlay:                                          // ← fondo oscurecido detrás del drawer (por debajo del header, que es z-modal)
    "fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
  mobile_overlay_abierto:
    "opacity-100",
  mobile_overlay_cerrado:
    "pointer-events-none opacity-0",

  mobile_drawer:                                           // ← panel lateral fijo (drawer)
    "fixed inset-y-0 right-0 z-[var(--z-modal-nested)] flex w-[86%] max-w-xs flex-col bg-(--kt-bg) shadow-2xl shadow-slate-900/25 transition-transform duration-300 ease-out lg:hidden",
  mobile_drawer_abierto:
    "translate-x-0",
  mobile_drawer_cerrado:
    "translate-x-full",

  mobile_drawer_header:
    "flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4",
  mobile_drawer_cerrar:
    `inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 ${C.foco_ring} focus-visible:ring-offset-2`,

  mobile_scroll:
    "flex-1 overflow-y-auto px-4 pb-4 pt-4",

  mobile_links_lista:
    "mb-3 space-y-0.5",
  mobile_link:
    "flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--kt-teal-500)",

  mobile_link_activo:
    `${C.activo_bg} ${C.activo_texto} ${C.activo_sombra}`,

  mobile_link_inactivo:
    `text-(--kt-ink-soft) ${C.hover_bg} ${C.hover_texto}`,

  mobile_link_icono:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500",

  mobile_dropdowns_lista:
    "space-y-1.5",
  mobile_dropdown_tarjeta:
    "overflow-hidden rounded-2xl border transition-all duration-200",

  mobile_dropdown_tarjeta_abierta:
    `${C.borde_acento} bg-white shadow-md ${C.sombra_acento}`,

  mobile_dropdown_tarjeta_cerrada:
    "border-slate-100 bg-white shadow-sm shadow-slate-100",

  mobile_dropdown_trigger:
    "flex w-full items-center justify-between px-3 py-3 text-left transition-colors duration-150",

  mobile_dropdown_trigger_abierto:
    `${C.suave_bg_t}`,

  mobile_dropdown_trigger_cerrado:
    "hover:bg-slate-50",

  mobile_dropdown_icono_abierto:
    `flex h-8 w-8 items-center justify-center rounded-xl ${C.activo_bg} ${C.activo_texto} shadow-sm ${C.activo_sombra} transition-all duration-200`,

  mobile_dropdown_icono_cerrado:
    "flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all duration-200",

  mobile_dropdown_label_abierto:
    `text-sm font-bold ${C.suave_texto} transition-colors duration-150`,

  mobile_dropdown_label_cerrado:
    "text-sm font-bold text-slate-800 transition-colors duration-150",

  mobile_dropdown_chevron_abierto:
    `shrink-0 rotate-180 ${C.texto_acento} transition-all duration-200`,

  mobile_dropdown_chevron_cerrado:
    "shrink-0 text-slate-500 transition-all duration-200",

  mobile_dropdown_contenido:
    `${C.borde_acento_t} border-t px-2 pb-2 pt-1.5`,

  mobile_subgrupo_wrapper:
    "mb-2 last:mb-0",
  mobile_subgrupo_cabecera:
    "flex items-center gap-2 px-2 py-1",
  mobile_subgrupo_icono:
    "flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500",

  mobile_pie_usuario:
    "shrink-0 border-t border-slate-200/60 p-4",

  mobile_btn_login:
    `flex items-center justify-center gap-2 rounded-2xl ${C.activo_bg} px-4 py-3 text-sm font-black ${C.activo_texto} shadow-md ${C.activo_sombra} transition-opacity ${C.btn_hover}`,

  // ════════════════════════════════════════════════════════════════
  // USER BOX (navbar_userbox.jsx)
  // ════════════════════════════════════════════════════════════════

  userbox_avatar_xl:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--kt-teal-700) to-[var(--kt-petrol)] text-xs font-black text-white shadow-md shadow-[var(--kt-turquoise)]/30 ring-2 ring-white ring-offset-1",
  userbox_avatar_lg:
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-(--kt-teal-700) to-[var(--kt-petrol)] text-sm font-black text-white shadow-md shadow-[var(--kt-turquoise)]/30 ring-2 ring-white ring-offset-1",
  userbox_avatar_sm:
    "flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-(--kt-teal-700) to-[var(--kt-petrol)] text-[10px] font-black text-white shadow-sm shadow-[var(--kt-turquoise)]/30",

  userbox_online_sm:
    "relative flex h-1.5 w-1.5 shrink-0",
  userbox_online_sm_ping:
    "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75",
  userbox_online_sm_solido:
    "relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500",
  userbox_nombre:
    "truncate text-sm font-black text-slate-900",
  userbox_rol:
    "truncate text-xs font-semibold text-slate-500",

  userbox_mobile_tarjeta:
    "overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm",
  userbox_mobile_header:
    "flex items-center gap-2.5 p-2.5",
  userbox_mobile_logout_area:
    "border-t border-slate-100 p-1.5",
  userbox_mobile_logout_btn:
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50",
  userbox_logout_icono:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600",

  userbox_desktop_trigger:
    "flex items-center gap-1.5 rounded-xl px-1.5 py-1 ring-1 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--kt-teal-700)",
  userbox_desktop_trigger_abierto:
    "bg-slate-50 shadow-sm ring-slate-200",
  userbox_desktop_trigger_cerrado:
    "bg-white ring-slate-200/80 hover:bg-slate-50 hover:shadow-sm",
  userbox_desktop_nombre:
    "max-w-20 truncate text-[11px] font-black text-slate-900",
  userbox_desktop_rol:
    "max-w-20 truncate text-[9px] font-semibold uppercase tracking-wide text-(--kt-ink-mute)",
  userbox_desktop_chevron:
    "shrink-0 text-slate-500 transition-transform duration-200",

  userbox_desktop_panel:
    "absolute right-0 top-full z-[var(--z-modal)] mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/12 ring-1 ring-black/5 transition duration-150 ease-out",
  userbox_desktop_panel_header:
    "flex items-center gap-3 border-b border-slate-100 p-4",
  userbox_desktop_links_area:
    "p-1.5",
  userbox_desktop_link:
    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150",

  userbox_desktop_link_activo:
    `${C.activo_bg} ${C.activo_texto}`,

  userbox_desktop_link_inactivo:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  userbox_desktop_link_icono:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500",
  userbox_desktop_logout_area:
    "border-t border-slate-100 p-1.5",
  userbox_desktop_logout_btn:
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50",

};
