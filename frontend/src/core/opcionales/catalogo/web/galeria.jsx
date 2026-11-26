import { useState } from "react";
import { Package } from "lucide-react";
import { imagenCloudinary } from "../../../utils/imagen_cloudinary.js";

/** MCA-04: la foto principal y, si hay más, sus miniaturas. */
export default function Galeria({ fotos, nombre }) {
  const [actual, setActual] = useState(0);
  return (
    <div className="space-y-3">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-(--kt-border) bg-(--kt-bg-soft)">
        {fotos.length
          ? <img src={imagenCloudinary(fotos[actual], 800)} alt={fotos.length > 1 ? `${nombre}, foto ${actual + 1} de ${fotos.length}` : nombre} width={800} height={800} className="h-full w-full object-contain" />
          : <Package size={64} aria-hidden="true" className="text-slate-300" />}
      </div>
      {fotos.length > 1 && (
        <div role="group" aria-label="Fotos" className="flex gap-2 overflow-x-auto p-1">
          {fotos.map((foto, i) => (
            <button key={foto} type="button" aria-label={`Ver foto ${i + 1}`} aria-pressed={i === actual} onClick={() => setActual(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === actual ? "border-(--kt-teal-700)" : "border-(--kt-border)"}`}>
              <img src={imagenCloudinary(foto, 160)} alt="" loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
