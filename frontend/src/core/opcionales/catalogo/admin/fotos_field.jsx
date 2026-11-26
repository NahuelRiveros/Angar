import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { subirImagen } from "../../../api/upload_api.js";
import { imagenCloudinary } from "../../../utils/imagen_cloudinary.js";
import { mensajeError } from "../../comun/errores.js";
import { BOTON_SECUNDARIO, CAMPO } from "../../comun/estilos.js";

const MAX_FOTOS = 5;
const MAX_MB = 5;
const ICONO = "flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30";

/** MCA-04: hasta 5 fotos (subidas o por dirección), con su orden. `value`: lista de direcciones. */
export default function FotosField({ value, onChange }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [direccion, setDireccion] = useState("");
  const lugar = MAX_FOTOS - value.length;

  async function subir(evento) {
    const archivos = [...evento.target.files];
    evento.target.value = "";
    if (!archivos.length) return;
    if (archivos.length > lugar) return setError(`Podés sumar ${lugar} foto${lugar === 1 ? "" : "s"} más.`);
    if (archivos.some((a) => !a.type.startsWith("image/"))) return setError("Solo se aceptan imágenes.");
    if (archivos.some((a) => a.size > MAX_MB * 1024 * 1024)) return setError(`Cada foto puede pesar hasta ${MAX_MB} MB.`);
    setError("");
    setSubiendo(true);
    const nuevas = [];
    try {
      for (const archivo of archivos) nuevas.push((await subirImagen(archivo)).url);
    } catch (e) { setError(mensajeError(e, "No se pudo subir la foto. Probá de nuevo.")); }
    // Las que sí subieron quedan aunque otra haya fallado.
    if (nuevas.length) onChange([...value, ...nuevas]);
    setSubiendo(false);
  }

  function agregarDireccion() {
    const url = direccion.trim();
    if (!/^https:\/\/\S+$/.test(url)) return setError("La dirección tiene que empezar con https://");
    if (value.includes(url)) return setError("Esa foto ya está.");
    setError("");
    setDireccion("");
    onChange([...value, url]);
  }

  function mover(i, pasos) {
    const orden = [...value];
    [orden[i], orden[i + pasos]] = [orden[i + pasos], orden[i]];
    onChange(orden);
  }

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {value.map((url, i) => (
            <li key={url} className="w-36 overflow-hidden rounded-xl border border-slate-200">
              <img src={imagenCloudinary(url, 300)} alt={`Foto ${i + 1}`} className="h-28 w-full bg-slate-50 object-contain" />
              <p className="h-5 text-center text-xs font-semibold text-slate-600">{i === 0 && "Principal"}</p>
              <div className="flex justify-between">
                <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Mover foto ${i + 1} antes`} className={ICONO}><ArrowLeft size={16} aria-hidden="true" /></button>
                <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} aria-label={`Quitar foto ${i + 1}`} className={ICONO}><X size={16} aria-hidden="true" /></button>
                <button type="button" disabled={i === value.length - 1} onClick={() => mover(i, 1)} aria-label={`Mover foto ${i + 1} después`} className={ICONO}><ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {lugar > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className={`${BOTON_SECUNDARIO} cursor-pointer focus-within:ring-4 focus-within:ring-black/15`}>
            <ImagePlus size={18} aria-hidden="true" /> {subiendo ? "Subiendo…" : "Subir fotos"}
            <input type="file" accept="image/*" multiple disabled={subiendo} onChange={subir} className="sr-only" />
          </label>
          <div className="flex min-w-0 flex-1 gap-2">
            <input type="url" aria-label="Dirección de una foto" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="O pegá la dirección: https://…" className={CAMPO}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarDireccion(); } }} />
            <button type="button" onClick={agregarDireccion} className={BOTON_SECUNDARIO}>Agregar</button>
          </div>
        </div>
      )}
      <p className="text-sm text-slate-600">{value.length} de {MAX_FOTOS}. La primera es la principal.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
