import ProductCard from "../../../controls/catalog/product_card.jsx";
import { imagenCloudinary } from "../../../utils/imagen_cloudinary.js";
import { formatearPrecio, tienePrecio } from "../../../utils/dinero.js";
import { compra } from "../compra.js";

const sinCompra = () => ({});
const useCompra = compra?.useTarjeta ?? sinCompra;

/** Tarjeta de un producto del catálogo (MCA-03). Si hay quien venda, con el botón de agregar. */
export default function Tarjeta({ producto, ...resto }) {
  const comprar = useCompra(producto);
  const { nombre, slug, foto, categoria, precio, precio_anterior, desde, disponible, con_opciones } = producto;
  const descuento = tienePrecio(precio_anterior) ? Math.round((1 - Number(precio) / Number(precio_anterior)) * 100) : 0;
  return (
    <ProductCard
      name={nombre} brand={categoria} to={`/catalogo/${slug}`} image={imagenCloudinary(foto, 400)}
      price={tienePrecio(precio) ? formatearPrecio(precio) : null} pricePrefix={desde ? "Desde " : ""} previousPrice={descuento ? formatearPrecio(precio_anterior) : null}
      discountPercent={descuento} unavailable={!disponible} taxNote={null} emptyPriceLabel="Consultar precio" linkLabel={con_opciones ? "Ver opciones" : "Ver producto"}
      {...comprar} {...resto}
    />
  );
}
