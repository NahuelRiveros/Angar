import { formatearPrecio, tienePrecio } from "../../utils/dinero.js";

/**
 * Un precio con su anterior tachado (si es mayor). Sin precio, el texto de `sinPrecio`.
 * `tamano`: chico (listas), normal o grande (ficha de producto).
 */
export default function Precio({ monto, anterior = null, tamano = "normal", sinPrecio = "Consultar precio" }) {
  if (!tienePrecio(monto)) return <p className={`font-semibold text-(--kt-ink-soft) ${{ chico: "text-sm", normal: "text-base", grande: "text-xl" }[tamano]}`}>{sinPrecio}</p>;
  const tachado = tienePrecio(anterior) && Number(anterior) > Number(monto);
  const letra = { chico: "text-base font-bold", normal: "text-xl font-extrabold", grande: "text-3xl font-extrabold" }[tamano];
  return (
    <p>
      {tachado && <span className="block text-(--kt-ink-soft) line-through">{formatearPrecio(anterior)}</span>}
      <span className={`${letra} tabular-nums`}>{formatearPrecio(monto)}</span>
    </p>
  );
}
