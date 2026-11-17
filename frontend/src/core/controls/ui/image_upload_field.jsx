import { useRef, useState } from "react";
import { ImagePlus, X, Link, Info } from "lucide-react";
import { subirImagen, eliminarImagen } from "../../api/upload_api.js";

/**
 * Campo de imagen con drag & drop (sube a Cloudinary vía /upload/imagen) +
 * fallback de URL manual — mismo patrón que ya probó marcas_tab.jsx
 * (eccomerce_indumentaria), generalizado acá para cualquier feature que
 * necesite subir una imagen. `value`/`onChange` son la URL final (string),
 * igual que cualquier InputField controlado.
 */
export default function ImageUploadField({ label, tooltip, value, onChange }) {
  const fileRef = useRef(null);
  const pendingPubId = useRef(null); // public_id del último upload de esta sesión, por si se reemplaza sin guardar
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(!value);
  const [error, setError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Solo se aceptan imágenes."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("El archivo no puede superar 5 MB."); return; }
    setError("");
    setUploading(true);
    try {
      if (pendingPubId.current) {
        eliminarImagen(pendingPubId.current).catch(() => {});
        pendingPubId.current = null;
      }
      const { url, public_id } = await subirImagen(file);
      pendingPubId.current = public_id;
      onChange(url);
      setUrlMode(false);
    } catch {
      setError("No se pudo subir la imagen. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleFileInput(e) {
    handleFile(e.target.files[0]);
    e.target.value = "";
  }

  function clearImagen() {
    onChange("");
    pendingPubId.current = null;
    setUrlMode(true);
  }

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 flex items-center gap-1 text-sm font-semibold text-gray-700">
          {label}
          {tooltip && (
            <span className="group/tooltip relative inline-flex">
              <Info className="h-3.5 w-3.5 cursor-help text-gray-400 hover:text-gray-600" />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-max max-w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
              >
                {tooltip}
              </span>
            </span>
          )}
        </label>
      )}

      <div className="flex items-start gap-3">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !uploading && fileRef.current?.click()}
          title="Arrastrá una imagen o hacé clic para seleccionar"
          className={[
            "relative flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed transition-all select-none",
            isDragging
              ? "scale-[1.03] border-blue-500 bg-blue-50"
              : uploading
              ? "cursor-not-allowed border-slate-200 bg-white opacity-70"
              : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50",
          ].join(" ")}
        >
          {uploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          ) : value ? (
            <img
              src={value} alt="preview" className="h-full w-full object-contain p-2"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <>
              <ImagePlus size={18} className={isDragging ? "text-blue-600" : "text-slate-400"} />
              <span className={`px-1 text-center text-[9px] font-semibold leading-tight ${isDragging ? "text-blue-600" : "text-slate-400"}`}>
                {isDragging ? "Soltar aquí" : "Subir imagen"}
              </span>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          {(urlMode || !value) && (
            <div className="flex items-center gap-1.5">
              <Link size={11} className="shrink-0 text-slate-400" />
              <input
                value={value} onChange={(e) => onChange(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
                placeholder="O pegá una URL de imagen…"
              />
            </div>
          )}

          {value && !urlMode && (
            <button type="button" onClick={() => setUrlMode(true)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600">
              <Link size={9} /> Usar URL en su lugar
            </button>
          )}

          {value && (
            <button type="button" onClick={clearImagen} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-500">
              <X size={9} /> Quitar imagen
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
