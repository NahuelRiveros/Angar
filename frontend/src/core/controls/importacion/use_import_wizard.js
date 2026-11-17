import { useState, useRef, useEffect, useCallback } from "react";
import { downloadBlob } from "./download.js";
const readOptions = (o) => JSON.stringify([o.sheet, o.headerRow, o.delimiter, o.encoding]);
export function useImportWizard({ api, config, suggestMapping, storageKey, onComplete }) {
  const [file, setFile] = useState(null), [options, setOptions] = useState(() => ({ ...config.defaults }));
  const [preview, setPreview] = useState(null), [mapping, setMapping] = useState({});
  const [job, setJob] = useState(null), [history, setHistory] = useState([]);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [running, setRunning] = useState(false);
  const [skipErrors, setSkipErrors] = useState(false), [profileName, setProfileName] = useState("");
  const [profiles, setProfiles] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem(storageKey)); return Array.isArray(value) ? value.filter((p) => p.version === config.version) : []; } catch { return []; }
  });
  const mounted = useRef(true), processing = useRef(false), validation = useRef(null);
  const refreshHistory = useCallback(async () => {
    try { const items = await api.history(); if (mounted.current) setHistory(items); }
    catch { if (mounted.current) setNotice("No se pudo actualizar el historial. Podés reintentarlo."); }
  }, [api]);
  useEffect(() => {
    mounted.current = true;
    refreshHistory();
    return () => { mounted.current = false; processing.current = false; };
  }, [refreshHistory]);
  async function perform(fn) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (e) { if (mounted.current) setError(e.response?.data?.mensaje || e.message || "No se pudo completar la operación."); }
    finally { if (mounted.current) setBusy(false); }
  }
  function chooseFile(next) {
    setFile(next); setPreview(null); setMapping({}); setJob(null); validation.current = null; setError(""); setNotice("");
  }
  function onOption(key, value) { setOptions((old) => ({ ...old, [key]: value })); }
  async function read() {
    await perform(async () => {
      if (!file || file.size > config.maxBytes) throw new Error("Seleccioná un archivo de hasta " + config.maxBytes / 1024 / 1024 + " MB.");
      const data = await api.preview(file, options);
      if (!mounted.current) return;
      setPreview({ ...data, readSignature: readOptions(options) });
      setMapping(suggestMapping(data.columns)); validation.current = null;
    });
  }
  async function validate() {
    await perform(async () => {
      const signature = JSON.stringify([mapping, options]);
      if (!validation.current || validation.current.file !== file || validation.current.signature !== signature) validation.current = { file, signature, key: crypto.randomUUID() };
      const next = await api.validate(file, options, mapping, validation.current.key);
      if (!mounted.current) return;
      setJob(next); setSkipErrors(false); await refreshHistory();
    });
  }
  async function run() {
    if (processing.current) return;
    processing.current = true; setRunning(true); setError("");
    try {
      let current = await api.get(job.id); if (mounted.current) setJob(current);
      while (processing.current && !["completado", "cancelado"].includes(current.estado)) {
        current = await api.batch(current.id, { index: current.siguiente_lote, confirm: true, skipErrors });
        if (mounted.current) setJob(current);
      }
      if (current.estado === "completado") onComplete?.();
      await refreshHistory();
    } catch (e) {
      if (mounted.current) setError(e.response?.data?.mensaje || "Se interrumpió la conexión. Reanudá para consultar el último lote guardado sin duplicarlo.");
    } finally { processing.current = false; if (mounted.current) setRunning(false); }
  }
  function saveProfile() {
    try {
      const next = [...profiles.filter((p) => p.name !== profileName.trim()), { name: profileName.trim(), version: config.version, columns: preview.columns.map((c) => c.name), mapping, options }];
      localStorage.setItem(storageKey, JSON.stringify(next)); setProfiles(next); setNotice("Mapeo guardado en este navegador."); setError("");
    } catch { setError("No se pudo guardar el mapeo en este navegador."); }
  }
  function applyProfile(name) {
    const profile = profiles.find((p) => p.name === name); if (!profile) return;
    const matches = JSON.stringify(profile.columns) === JSON.stringify(preview.columns.map((c) => c.name));
    setMapping(matches ? profile.mapping : suggestMapping(preview.columns));
    setOptions((old) => ({ ...profile.options, sheet: old.sheet, headerRow: old.headerRow, delimiter: old.delimiter, encoding: old.encoding }));
    setProfileName(name); setNotice(matches ? "Mapeo aplicado. Revisá las columnas antes de validar." : "La estructura del archivo cambió. Revisá las asociaciones sugeridas; no se aplicaron posiciones antiguas.");
  }
  return {
    file, options, preview: preview && preview.readSignature === readOptions(options) ? preview : null, mapping, job, history, error, notice, busy, running, skipErrors, profiles, profileName,
    chooseFile, onOption, setMapping: (key, value) => setMapping((old) => ({ ...old, [key]: value })), read, validate, run,
    pause: () => { processing.current = false; }, setSkipErrors, setProfileName, saveProfile, applyProfile, refreshHistory,
    openJob: (id) => perform(async () => { const next = await api.get(id); if (mounted.current) { setJob(next); setSkipErrors(false); } }),
    cancel: () => perform(async () => { const next = await api.cancel(job.id); if (mounted.current) setJob(next); await refreshHistory(); }),
    back: () => { setJob(null); setSkipErrors(false); validation.current = null; setError(""); },
    template: () => perform(async () => downloadBlob(await api.template(), "plantilla-catalogo.xlsx")),
    report: () => perform(async () => downloadBlob(await api.report(job.id), "informe-importacion.csv")),
  };
}
