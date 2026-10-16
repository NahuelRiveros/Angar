import { sequelize } from "../sequelize.js";
import { projectModules } from "../../configuracion_servidor/gate_config.js";
import { CategoriaDistribuidora } from "../../models/index.js";
import { completarFamilias } from "./completar_catalogo_distribuidora.js";

/**
 * Familias y categorías con las que arranca una instalación nueva de la
 * distribuidora (dos niveles: Familia › Categoría). Editar esta lista en la
 * copia de cada cliente antes del primer arranque.
 * Base generalista para alimentos, bebidas y artículos de consumo del hogar.
 * Solo crea la clasificación: los artículos, precios y stock se cargan aparte.
 * Fuentes y criterios de clasificación: docs/catalogo-inicial-distribuidora.md.
 * Cada categoría representa un tipo de producto; los sabores, tamaños y
 * presentaciones se resuelven en los artículos, no creando más categorías.
 */
export const FAMILIAS_INICIALES = {
  "Almacén": [
    "Galletitas", "Arroz", "Legumbres", "Fideos", "Harinas", "Premezclas Saladas", "Aceites",
    "Aceites de Oliva", "Vinagres", "Acetos", "Jugo de Limón", "Conservas de Verduras",
    "Conservas de Pescado", "Salsas de Tomate", "Mayonesas", "Mostazas", "Ketchup", "Salsa Golf",
    "Salsa Barbacoa", "Salsas de Ajo", "Salsa Cheddar", "Salsa Parmesano", "Salsa Roquefort",
    "Salsa Tártara", "Salsa César", "Salsa Ranch", "Chimichurri", "Salsa de Soja", "Salsa Inglesa",
    "Salsas Picantes", "Salsa Teriyaki", "Caldos", "Sopas", "Sal", "Condimentos",
    "Azúcar", "Edulcorantes", "Mermeladas", "Dulces Sólidos", "Polenta", "Puré Instantáneo",
    "Pan Rallado", "Rebozadores", "Aceitunas", "Encurtidos", "Conservas de Frutas", "Pasta de Maní",
    "Crema de Avellanas", "Pastas Instantáneas", "Rocíos Vegetales", "Margarinas", "Grasas Comestibles",
  ],
  "Bebidas": [
    "Gaseosas", "Aguas", "Jugos", "Vinos Tintos", "Vinos Blancos", "Vinos Rosados", "Cervezas",
    "Aguas Saborizadas", "Jugos en Polvo", "Bebidas Isotónicas", "Energizantes", "Sodas",
    "Aperitivos con Alcohol", "Aperitivos sin Alcohol", "Espumantes", "Vodka", "Gin", "Whisky",
    "Ron", "Tequila", "Licores", "Sidras",
  ],
  "Limpieza": [
    "Lavandinas", "Detergentes", "Desinfectantes", "Jabones para Ropa", "Suavizantes",
    "Quitamanchas", "Limpiadores de Pisos", "Limpiadores de Cocina", "Limpiadores de Baño",
    "Limpiavidrios", "Desodorantes de Ambiente", "Insecticidas", "Esponjas", "Paños", "Escobas",
    "Secadores de Piso", "Bolsas de Residuos", "Repelentes", "Ceras para Pisos", "Aprestos",
    "Perfumantes para Ropa", "Antihumedad", "Limpiadores de Inodoros", "Guantes de Limpieza",
    "Baldes", "Palanganas", "Trapos de Piso", "Franelas", "Rejillas de Limpieza", "Escobillones",
    "Cabos", "Broches para Ropa", "Pastillas para Inodoros", "Repasadores",
  ],
  "Perfumería": [
    "Jabones", "Shampoo", "Acondicionador", "Desodorantes", "Cuidado Corporal", "Cuidado Facial",
    "Protección Solar", "Talcos", "Colonias", "Coloración", "Tratamientos Capilares",
    "Cuidado de los Pies", "Cremas para Manos",
  ],
  "Ferretería": [
    "Herramientas", "Electricidad", "Pinturas", "Adhesivos", "Selladores", "Pilas", "Baterías",
    "Lámparas", "Lubricantes", "Cintas",
  ],
  "Lácteos": [
    "Leches", "Yogures", "Quesos", "Mantecas", "Cremas de Leche", "Dulce de Leche", "Postres",
    "Flanes",
  ],
  "Fiambres": [
    "Jamones", "Salames", "Embutidos", "Mortadelas", "Pancetas", "Leberwurst", "Patés", "Bondiolas",
    "Lomitos",
  ],
  "Golosinas": [
    "Chocolates", "Caramelos", "Alfajores", "Chicles", "Gomitas", "Chupetines", "Turrones",
    "Confites", "Obleas",
  ],
  "Congelados": [
    "Hamburguesas", "Verduras Congeladas", "Helados", "Papas Congeladas", "Milanesas",
    "Rebozados de Pollo", "Pescados", "Mariscos", "Pizzas Congeladas",
  ],
  "Bazar": [
    "Descartables", "Vajilla", "Envases", "Utensilios de Cocina", "Termos", "Mates", "Ollas",
    "Sartenes", "Papel Aluminio", "Film", "Bolsas para Alimentos", "Cubiertos", "Cuchillos",
    "Fuentes para Horno", "Moldes de Repostería", "Tablas de Cortar", "Vasos", "Copas", "Tazas",
    "Jarras", "Bowls", "Bombillas", "Botellas Térmicas", "Organizadores", "Jarros Hervidores",
    "Pizzeras", "Torteras", "Fraperas", "Conservadoras",
  ],
  "Desayuno y Merienda": [
    "Yerba Mate", "Café Molido", "Café en Grano", "Café Instantáneo", "Cápsulas de Café", "Té",
    "Mate Cocido", "Cacao en Polvo", "Chocolatadas", "Cereales", "Barras de Cereal",
  ],
  "Panificados": [
    "Pan de Molde", "Panes para Hamburguesas", "Panes para Panchos", "Tostadas", "Grisines",
    "Budines", "Magdalenas", "Piononos", "Pan Dulce", "Panettones", "Tortillas", "Bizcochitos",
    "Marineras",
  ],
  "Snacks": [
    "Papas Fritas", "Snacks de Maíz", "Palitos Salados", "Maní", "Mix de Frutos Secos",
  ],
  "Pastas Frescas y Tapas": [
    "Ravioles", "Sorrentinos", "Ñoquis", "Tallarines Frescos", "Tapas de Empanadas",
    "Tapas de Tartas", "Capeletis", "Agnolotis", "Tapas de Pastelitos", "Masa para Lasagna",
  ],
  "Higiene Personal": [
    "Pastas Dentales", "Cepillos Dentales", "Enjuagues Bucales", "Afeitado", "Toallitas Femeninas",
    "Protectores Diarios", "Tampones", "Preservativos", "Algodón", "Hisopos", "Hilo Dental",
    "Adhesivos para Prótesis Dentales", "Pañales para Adultos", "Toallitas para Adultos",
  ],
  "Papelera": [
    "Papel Higiénico", "Rollos de Cocina", "Servilletas", "Pañuelos Descartables",
  ],
  "Bebés": [
    "Pañales", "Toallitas Húmedas", "Higiene del Bebé",
  ],
  "Mascotas": [
    "Alimentos Secos para Perros", "Alimentos Húmedos para Perros", "Alimentos Secos para Gatos",
    "Alimentos Húmedos para Gatos", "Snacks para Perros", "Snacks para Gatos", "Piedras Sanitarias",
  ],
  "Alimentos Naturales": [
    "Semillas", "Avena", "Granola", "Galletas de Arroz", "Bebidas Vegetales", "Miel",
  ],
  "Repostería": [
    "Premezclas Dulces", "Polvo de Hornear", "Levaduras", "Esencias", "Coberturas de Chocolate",
    "Gelatinas en Polvo", "Postres en Polvo", "Flanes en Polvo", "Decoraciones Comestibles",
    "Coco Rallado",
  ],
  "Librería": [
    "Bolígrafos", "Lápices", "Marcadores", "Cuadernos", "Resmas", "Gomas de Borrar", "Sacapuntas",
    "Tijeras", "Reglas",
  ],
};

/**
 * El arranque solo siembra catálogos vacíos. La actualización explícita usa
 * completar:true para agregar faltantes a una instalación con datos.
 * Si recibe transaction, el llamador confirma toda la actualización junta.
 */
export async function seed_familias_distribuidora({ completar = false, transaction } = {}) {
  if (!projectModules.eccomerce_distribuidora) return;
  if (!completar && await CategoriaDistribuidora.count({ transaction })) return;
  const ejecutar = (tx) => completarFamilias(CategoriaDistribuidora, FAMILIAS_INICIALES, tx);
  if (transaction) return ejecutar(transaction);
  const resultado = await sequelize.transaction(ejecutar);
  console.log(`✅ Catálogo: ${resultado.familias} familias y ${resultado.categorias} categorías agregadas`);
  return resultado;
}
