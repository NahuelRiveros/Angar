// Compartido entre ProductCard (catálogo) y el detalle de producto — mismo
// semáforo de color en los dos lugares donde se decide si comprar o no.
const TONE = {
  ok:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  out: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function StockBadge({ stock, className = "" }) {
  // tone "unknown" = el producto no tiene control de stock activado — no hay
  // nada real que informar ahí, así que no mostramos nada en vez de un
  // "disponibilidad a confirmar" que no aporta y ocupa espacio en la card.
  if (!stock || stock.tone === "unknown") return null;
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${TONE[stock.tone]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {stock.label}
    </span>
  );
}
