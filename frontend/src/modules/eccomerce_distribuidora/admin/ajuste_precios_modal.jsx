import { useState } from "react";
import { X, DollarSign } from "lucide-react";
import InputField from "../../../controls/ui/input_field.jsx";
import ComboboxField from "../../../controls/ui/combobox_field.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { ajustarPreciosMasivo } from "../api/producto_distribuidora_api.js";

/* ── modal: ajuste de precios (individual por producto, o masivo por
   categoría/todos los productos) — mismo endpoint, distinto alcance ────── */

export default function AjustePreciosModal({ productoFijo, opcionesCategoria, onClose, onAplicado }) {
  const [alcance, setAlcance] = useState(productoFijo ? "producto" : "categoria");
  const [categoriaId, setCategoriaId] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [confirmarTodo, setConfirmarTodo] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  const titulo = productoFijo ? `Ajustar precio de "${productoFijo.nombre}"` : "Ajuste masivo de precios";

  async function aplicar() {
    const pct = Number(porcentaje);
    if (!porcentaje || Number.isNaN(pct) || pct === 0) { setError("Ingresá un porcentaje distinto de 0 (ej: 10 o -5)"); return; }
    if (alcance === "categoria" && !categoriaId) { setError("Elegí una categoría"); return; }
    if (alcance === "todo" && !confirmarTodo) { setError("Tildá la confirmación para aplicar a todos los productos"); return; }

    setError("");
    setAplicando(true);
    try {
      const payload = { porcentaje: pct };
      if (productoFijo) payload.producto_id = productoFijo.id;
      else if (alcance === "categoria") payload.categoria_id = Number(categoriaId);
      else payload.confirmarTodoElCatalogo = true;

      const r = await ajustarPreciosMasivo(payload);
      if (r?.ok === false) { setError(r.mensaje); return; }
      setResultado(r.data.cantidad);
      onAplicado();
    } catch (e) {
      setError(e?.response?.data?.mensaje || "No se pudo aplicar el ajuste");
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <ErrorBanner message={error} />

          {resultado !== null ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Listo — se actualizaron {resultado} variedad(es).
            </div>
          ) : (
            <>
              {!productoFijo && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAlcance("categoria")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${alcance === "categoria" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-500"}`}>
                    Por categoría
                  </button>
                  <button type="button" onClick={() => setAlcance("todo")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${alcance === "todo" ? "border-rose-600 bg-rose-50 text-rose-700" : "border-slate-300 text-slate-500"}`}>
                    Todos los productos
                  </button>
                </div>
              )}

              {!productoFijo && alcance === "categoria" && (
                <ComboboxField
                  label="Familia o categoría"
                  required
                  options={opcionesCategoria}
                  value={categoriaId}
                  onChange={setCategoriaId}
                  helperText="Si elegís una familia, incluye todas sus categorías."
                />
              )}

              <InputField
                label="Porcentaje (positivo sube, negativo baja)"
                type="number" step="0.1"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                hideMessage placeholder="Ej: 10 o -5"
              />

              {!productoFijo && alcance === "todo" && (
                <label className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                  <input type="checkbox" checked={confirmarTodo} onChange={(e) => setConfirmarTodo(e.target.checked)} className="mt-0.5" />
                  Sí, quiero aplicar este ajuste a TODOS los productos.
                </label>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} disabled={aplicando}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                  Cancelar
                </button>
                <button type="button" onClick={aplicar} disabled={aplicando}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  <DollarSign size={14} /> {aplicando ? "Aplicando..." : "Aplicar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
