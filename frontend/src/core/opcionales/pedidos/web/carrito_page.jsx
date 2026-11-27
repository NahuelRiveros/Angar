import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Package, ShoppingBag, Trash2 } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { authLink } from "../../../controls/acceso/return_to.js";
import { authConfig } from "../../../config/auth_config.js";
import QuantityInput from "../../../controls/ui/quantity_input.jsx";
import { imagenCloudinary } from "../../../utils/imagen_cloudinary.js";
import { formatearPrecio } from "../../../utils/dinero.js";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from "../../../controls/ui/estilos.js";
import { MAX_CANTIDAD, aplicarCambios, cambiarCantidad, quitar, useCarrito, vaciar } from "../carrito.js";
import { useEnviarPedido } from "../hooks.js";
import { tienda } from "../opciones.js";
import DatosEnvio from "./datos_envio.jsx";

export default function CarritoPage() {
  const { items, total } = useCarrito();
  const enviar = useEnviarPedido();
  const navigate = useNavigate();
  const [cambios, setCambios] = useState([]);
  const { usuario, cargando } = useAuth();
  const pideIngresar = tienda.exigirCuenta && !usuario;

  async function confirmar(datos, clave_envio) {
    setCambios([]);
    try {
      const pedido = await enviar.mutateAsync({ ...datos, clave_envio, items: items.map(({ variante_id, cantidad, precio }) => ({ variante_id, cantidad, precio_visto: precio })) });
      vaciar();
      navigate(`/pedido/${pedido.clave}?nuevo=1`, { replace: true });
    } catch (error) {
      // MPE-03: se actualiza el carrito y se explica qué cambió; lo escrito en el formulario queda.
      const avisados = error.response?.data?.datos?.cambios;
      if (!avisados) throw error;
      aplicarCambios(avisados);
      setCambios(avisados);
    }
  }

  return (
    <div className="kt-body min-h-screen bg-white text-(--kt-ink)">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="kt-display text-3xl font-bold sm:text-4xl">Tu carrito</h1>
        {cambios.length > 0 && <AvisoCambios cambios={cambios} />}
        {items.length === 0 ? <Vacio /> : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
            <section aria-label="Productos">
              <ul className="divide-y divide-(--kt-border) border-y border-(--kt-border)">
                {items.map((linea) => <Linea key={linea.variante_id} linea={linea} />)}
              </ul>
              <p className="mt-4 flex items-baseline justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-extrabold tabular-nums">{formatearPrecio(total)}</span>
              </p>
              <p className="mt-1 text-sm text-(--kt-ink-soft)">Los precios se confirman al enviar el pedido.</p>
            </section>
            {cargando && tienda.exigirCuenta ? null : pideIngresar ? <Ingresar /> : <DatosEnvio firma={items.map((l) => `${l.variante_id}:${l.cantidad}:${l.precio}`).join(",")} enviando={enviar.isPending} onEnviar={confirmar} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Linea({ linea }) {
  const nombre = linea.opcion ? `${linea.producto} (${linea.opcion})` : linea.producto;
  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-3 py-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center">
      <span className="flex h-18 w-18 items-center justify-center overflow-hidden rounded-xl bg-(--kt-bg-soft) sm:h-20 sm:w-20">
        {linea.foto ? <img src={imagenCloudinary(linea.foto, 160)} alt="" className="h-full w-full object-contain p-1" /> : <Package size={26} aria-hidden="true" className="text-slate-300" />}
      </span>
      <div className="min-w-0">
        {linea.slug ? <Link to={`/catalogo/${linea.slug}`} className="font-semibold hover:underline">{linea.producto}</Link> : <span className="font-semibold">{linea.producto}</span>}
        {linea.opcion && <p className="text-sm text-(--kt-ink-soft)">{linea.opcion}</p>}
        <p className="text-sm text-(--kt-ink-soft) tabular-nums">{formatearPrecio(linea.precio)} c/u</p>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
        <QuantityInput value={linea.cantidad} onChange={(n) => cambiarCantidad(linea.variante_id, n)} max={MAX_CANTIDAD} label={`Cantidad de ${nombre}`} />
        <span className="w-28 text-right font-bold tabular-nums">{formatearPrecio((Math.round(Number(linea.precio) * 100) * linea.cantidad) / 100)}</span>
        <button type="button" onClick={() => quitar(linea.variante_id)} aria-label={`Quitar ${nombre}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-red-700 hover:bg-red-50">
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function AvisoCambios({ cambios }) {
  return (
    <div role="alert" className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p className="font-bold">Algunos productos cambiaron desde que los agregaste. Revisá tu carrito y volvé a enviar.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {cambios.map((c) => (
          <li key={c.variante_id}>
            {c.tipo === "precio" ? <>{c.nombre}: ahora cuesta <strong>{formatearPrecio(c.precio)}</strong>.</>
              : <>{c.nombre ?? "Un producto"} ya no está disponible: lo sacamos del carrito.</>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** MOD-15: el proyecto exige cuenta para pedir; el carrito queda guardado mientras tanto. */
function Ingresar() {
  const { pathname } = useLocation();
  return (
    <div className="rounded-2xl border border-(--kt-border) bg-(--kt-bg-soft) p-4 text-center sm:p-6">
      <h2 className="text-xl font-bold">Ingresá para enviar tu pedido</h2>
      <p className="mt-1 text-(--kt-ink-soft)">Tu carrito queda guardado.{!authConfig.publicRegistration && " Si todavía no tenés cuenta, pedínosla."}</p>
      <div className="mt-4 flex flex-col gap-2">
        <Link to={authLink("/login", pathname)} className={BOTON_PRIMARIO}><LogIn size={18} aria-hidden="true" /> Ingresar</Link>
        {authConfig.publicRegistration && <Link to={authLink("/register", pathname)} className={BOTON_SECUNDARIO}>Crear una cuenta</Link>}
      </div>
    </div>
  );
}

function Vacio() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-(--kt-border) px-4 py-16 text-center">
      <ShoppingBag size={44} aria-hidden="true" className="mx-auto text-slate-400" />
      <p className="mt-3 text-lg font-semibold">Tu carrito está vacío</p>
      <Link to="/catalogo" className={`${BOTON_PRIMARIO} mt-5`}>Ver el catálogo</Link>
    </div>
  );
}
