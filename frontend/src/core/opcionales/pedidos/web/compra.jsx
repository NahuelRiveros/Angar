import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import QuantityInput from "../../../controls/ui/quantity_input.jsx";
import { BOTON_COMPRA, BOTON_SECUNDARIO } from "../../comun/estilos.js";
import { MAX_CANTIDAD, agregar, useCarrito } from "../carrito.js";
import { lineaDe, sePuedeComprar, useAviso } from "./agregar.js";

// Lo que el catálogo muestra cuando este módulo está prendido (ver modulo_pantallas.jsx). El catálogo
// no conoce a pedidos: solo pregunta si hay alguien que venda.

/** Ícono de la barra con la cantidad de unidades. */
export function BotonCarrito() {
  const { unidades } = useCarrito();
  return (
    <Link to="/carrito" aria-label={unidades ? `Carrito: ${unidades} ${unidades === 1 ? "unidad" : "unidades"}` : "Carrito vacío"}
      className="relative flex h-11 w-11 items-center justify-center rounded-full text-(--kt-night) hover:bg-black/5">
      <ShoppingBag size={22} aria-hidden="true" />
      {unidades > 0 && (
        <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--kt-accent-comercial) px-1 text-[11px] font-extrabold text-white">
          {unidades > 99 ? "99+" : unidades}
        </span>
      )}
    </Link>
  );
}

/** MCA-03: sin precio o sin stock no se agrega. En la ficha, con cantidad. */
export function ComprarFicha({ producto, variante }) {
  const [cantidad, setCantidad] = useState(1);
  const [aviso, mostrar] = useAviso();
  if (!sePuedeComprar(variante)) return null;
  function sumar() {
    try {
      agregar(lineaDe(producto, variante), cantidad);
      mostrar({ ok: true, texto: `Agregaste ${cantidad} al carrito.` });
    } catch (error) {
      mostrar({ ok: false, texto: error.message });
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityInput value={cantidad} onChange={setCantidad} max={MAX_CANTIDAD} />
        <button type="button" onClick={sumar} className={`${BOTON_COMPRA} flex-1 sm:flex-none`}><ShoppingBag size={20} aria-hidden="true" /> Agregar al carrito</button>
      </div>
      <div aria-live="polite">
        {aviso && (
          <p className={`flex flex-wrap items-center gap-3 text-sm font-semibold ${aviso.ok ? "text-emerald-700" : "text-red-700"}`}>
            {aviso.texto}{aviso.ok && <Link to="/carrito" className={`${BOTON_SECUNDARIO} min-h-9`}>Ver carrito</Link>}
          </p>
        )}
      </div>
    </div>
  );
}
