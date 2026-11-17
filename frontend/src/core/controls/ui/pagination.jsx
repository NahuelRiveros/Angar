export default function Pagination({ page, pages, total, onChange, disabled = false }) {
  if (!total) return null;
  return <nav aria-label="Páginas de resultados" className="flex flex-wrap items-center justify-center gap-3 py-5">
    <button type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">Anterior</button>
    <span aria-live="polite" className="text-sm">Página {page} de {Math.max(1, pages)} · {total} resultados</span>
    <button type="button" disabled={disabled || page >= pages} onClick={() => onChange(page + 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">Siguiente</button>
  </nav>;
}
