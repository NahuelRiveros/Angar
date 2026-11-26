// Formato y reglas de acceso: core/modules/ayuda/ayuda_temas.js.
export const temasAyudaCatalogo = [
  {
    id: "mod-catalogo-productos", grupo: "Catálogo", titulo: "Publicar productos",
    resumen: "Fotos, precios, opciones y qué se ve en la web.",
    palabras: ["precio", "foto", "talle", "opcion", "destacado", "oculto"], reglas: ["MCA-01", "MCA-02", "MCA-03", "MCA-04", "MCA-08"], pantalla: "/admin/catalogo/productos",
    secciones: [
      { titulo: "Lo importante", pasos: [
        "Sin precio se muestra \"Consultar precio\".",
        "Si viene en talles, colores o tamaños, agregá una opción por cada uno: todas llevan su nombre y pueden tener su precio.",
        "La primera foto es la principal. Podés cargar hasta 5 y cambiarles el orden.",
        "Destacado lo muestra en el inicio. Si destildás \"Se ve en la web\", se oculta sin borrarse.",
      ] },
      { titulo: "Errores comunes", problemas: [
        { problema: "Dice que otra persona cambió el producto.", solucion: "Alguien lo guardó mientras lo tenías abierto. Recargá la página y volvé a hacer tu cambio." },
        { problema: "El producto está visible pero no aparece en la web.", solucion: "Fijate si su categoría, o la de arriba, está oculta." },
      ] },
    ],
    relacionados: ["mod-catalogo-categorias"],
  },
  {
    id: "mod-catalogo-categorias", grupo: "Catálogo", titulo: "Categorías",
    resumen: "Cómo se agrupan los productos en la web.",
    palabras: ["rubro", "subcategoria", "orden"], reglas: ["MCA-05"], pantalla: "/admin/catalogo/categorias",
    secciones: [{ titulo: "Dos niveles", texto: "Una categoría puede tener subcategorías (Accesorios › Cascos), pero no más que eso. Ocultarla esconde también sus productos. Solo se puede borrar si nunca tuvo productos." }],
    relacionados: ["mod-catalogo-productos"],
  },
];
