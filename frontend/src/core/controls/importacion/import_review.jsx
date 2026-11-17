import ActionButton from "../ui/action_button.jsx";
const labels = { create: "Crear", update: "Actualizar", unchanged: "Sin cambios", skip: "Omitir", error: "Con errores" };
export default function ImportReview({ job, running, busy, skipErrors, onSkipErrors, onRun, onPause, onCancel, onBack, onReport }) {
  const done = job.estado === "completado", canceled = job.estado === "cancelado";
  const started = job.siguiente_lote > 0;
  const counts = done || canceled ? { ...job.resultado, total: job.resumen.total } : job.resumen;
  return <section aria-label="Revisión de importación" className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-lg font-bold">{done ? "Importación finalizada" : canceled ? "Importación cancelada" : "3. Revisar y confirmar la carga"}</h2>
    <p className="break-all font-semibold">{job.archivo}</p>
    <p className="text-sm text-slate-600">{done ? "Revisá el resultado y descargá el informe de todas las filas." : "La validación no carga productos. Al confirmar, se guardan lotes de forma progresiva."}</p>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries(labels).map(([key, label]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><dt className="text-sm text-slate-600">{label}</dt><dd className="text-xl font-bold">{counts[key] || 0}</dd></div>)}</dl>
    <p className="text-sm">Precios del archivo: <strong>{job.opciones.priceType === "gross" ? "con IVA incluido" : "netos, sin IVA"}</strong>. Campos de actualización: {job.opciones.updateFields.join(", ") || "ninguno"}.</p>
    <div><label htmlFor="import-progress" className="text-sm font-semibold">Lotes guardados: {job.siguiente_lote} de {job.total_lotes}</label><progress id="import-progress" className="mt-2 h-3 w-full" value={job.siguiente_lote} max={job.total_lotes} /></div>
    <p role="status" className="text-sm">{running ? "Cargando… Podés pausar al terminar el lote actual." : done ? "Proceso completado." : canceled ? "Los lotes ya guardados se conservaron." : started ? "Podés continuar desde el siguiente lote." : "Pendiente de confirmación."}</p>
    {!started && !done && !canceled && job.resumen.error > 0 && <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><input type="checkbox" className="mt-1" checked={skipErrors} onChange={(e) => onSkipErrors(e.target.checked)} disabled={running} />Importar solamente las filas válidas. Las {job.resumen.error} filas con errores quedarán excluidas y detalladas en el informe.</label>}
    <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} aria-label="Muestra del resultado">
      <table className="w-full text-left text-sm"><caption className="p-3 text-left">Muestra del primer lote. El informe incluye todas las filas.</caption><thead className="bg-slate-50"><tr>{["Fila", "SKU", "Producto", "Acción", "Neto anterior", "Neto a guardar", "Detalle"].map((v) => <th key={v} className="whitespace-nowrap p-2">{v}</th>)}</tr></thead>
        <tbody>{job.sample?.map((r) => <tr key={r.row} className="border-t border-slate-100"><td className="p-2">{r.row}</td><td className="p-2">{r.sku}</td><td className="min-w-40 p-2">{r.name}</td><td className="whitespace-nowrap p-2">{labels[r.action]}</td><td className="p-2">{r.previousPrice ?? "—"}</td><td className="p-2">{r.finalPrice ?? "—"}</td><td className="min-w-64 p-2">{r.message}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap gap-3">
      <ActionButton disabled={busy || running} onClick={onReport}>Descargar informe CSV</ActionButton>
      {running ? <ActionButton onClick={onPause}>Pausar después de este lote</ActionButton> : !done && !canceled && <ActionButton disabled={busy || (!started && job.resumen.error > 0 && !skipErrors)} onClick={onRun}>{started ? "Reanudar importación" : "Confirmar e importar"}</ActionButton>}
      {!done && !canceled && <ActionButton disabled={running || busy} onClick={onCancel}>Cancelar importación</ActionButton>}
      <ActionButton disabled={running || busy} onClick={onBack}>{done || canceled ? "Importar otro archivo" : "Volver al archivo y mapeo"}</ActionButton>
    </div>
  </section>;
}
