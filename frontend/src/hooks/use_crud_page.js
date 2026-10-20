import { useCallback, useEffect, useState } from "react";

/**
 * Estado y handlers compartidos por las páginas "listado + modal de alta/edición"
 * (ver productos_tab).
 * La página sigue armando su propio JSX (columnas de DataGrid, campos del modal,
 * header) — este hook solo evita reescribir cargar/abrir modal/guardar/toggle.
 *
 * @param {() => Promise<any>} fetchFn      Llama al endpoint de listado.
 * @param {(payload) => Promise<any>} [createFn]  Llama al endpoint de alta.
 * @param {(id, payload) => Promise<any>} [updateFn]  Llama al endpoint de edición.
 * @param {(respuesta) => any[]} [extractItems]  Saca el array de la respuesta (default: r.data ?? r.items ?? []).
 * @param {boolean} [autoCargar]  Si hace `cargar()` al montar (default: true).
 * @param {string} [mensajeErrorCarga]
 * @param {string} [mensajeErrorGuardar]
 */
export function useCrudPage({
  fetchFn,
  createFn,
  updateFn,
  extractItems = (r) => r?.data ?? r?.items ?? [],
  autoCargar = true,
  mensajeErrorCarga = "No se pudo cargar el listado",
  mensajeErrorGuardar = "No se pudo guardar",
}) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(autoCargar);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const r = await fetchFn();
      if (r && r.ok === false) { setError(r.mensaje || mensajeErrorCarga); return; }
      setItems(extractItems(r));
    } catch (e) {
      setError(e?.response?.data?.mensaje || e?.message || mensajeErrorCarga);
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  useEffect(() => {
    if (autoCargar) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNuevo() {
    setSeleccionado(null);
    setModalAbierto(true);
  }

  function abrirEditar(item) {
    setSeleccionado(item);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setSeleccionado(null);
  }

  async function guardar(payload) {
    setGuardando(true);
    try {
      const r = seleccionado
        ? await updateFn(seleccionado.id, payload)
        : await createFn(payload);
      if (r && r.ok === false) { setError(r.mensaje || mensajeErrorGuardar); return; }
      cerrarModal();
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.mensaje || e?.message || mensajeErrorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  /**
   * Para acciones puntuales por fila (activar/desactivar, borrar, etc.):
   * confirma si hace falta, llama la API, recarga el listado y captura el error.
   *
   *   ejecutarAccion(() => cambiarEstadoPlan(plan.id, nuevoEstado), {
   *     confirmMessage: `¿Seguro que querés ${accion} el plan "${plan.descripcion}"?`,
   *     mensajeError: `No se pudo ${accion} el plan`,
   *   });
   */
  async function ejecutarAccion(fn, { confirmMessage, mensajeError = "No se pudo completar la acción" } = {}) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    try {
      const r = await fn();
      if (r && r.ok === false) { setError(r.mensaje || mensajeError); return; }
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.mensaje || mensajeError);
    }
  }

  return {
    items, cargando, error, setError,
    modalAbierto, seleccionado, guardando,
    cargar, abrirNuevo, abrirEditar, cerrarModal, guardar, ejecutarAccion,
  };
}
