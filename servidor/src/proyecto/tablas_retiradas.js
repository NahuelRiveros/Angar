// Tablas de instalaciones anteriores que el arranque borra (DROP TABLE IF EXISTS, solo en
// nuestro schema). Primero las que dependen de otras.
export const TABLAS_RETIRADAS = [
  // 2026-11-18: el editor "Contenido del home" se quitó; la portada usa textos fijos y las promociones, los banners del core.
  "home_contenido", "home_area", "home_texto", "home_pilar", "home_contacto",
];
