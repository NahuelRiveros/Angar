/**
 * PLANTILLA — página "listado + alta/edición" (patrón CRUD del proyecto).
 *
 * No está enrutada (carpeta `_scaffold/`, igual que las `sin_usar/`): es un punto de partida
 * para copiar a `pages/.../mi_entidad_page.jsx`, no una page real.
 *
 * Cómo usarla:
 *   1. Copiá este archivo a la ubicación real y renombralo (ej: `pages/admin/marcas_page.jsx`).
 *   2. Creá en `api/` las 4 funciones que pide `useCrudPage` (getX, crearX, actualizarX, cambiarEstadoX)
 *      siguiendo el mismo contrato que ya usa el resto (`{ ok, data|items, mensaje }`).
 *   3. Reemplazá cada bloque marcado `// TODO:` — campos del modal, columnas del DataGrid, textos.
 *   4. Si el modal crece mucho, sacalo a `components/<dominio>/mi_entidad_form_modal.jsx`
 *      (componente específico de este proyecto — no va en `controls/`, que es el kit
 *      reusable entre proyectos; ver controls/modales/ para ejemplos del patrón).
 *
 * Ver también: hooks/use_crud_page.js (el estado y los handlers que arma esta página),
 * controls/ui/data_grid.jsx (tabla con búsqueda/orden/paginación) y
 * controls/ui/input_field.jsx (inputs de texto/número/fecha).
 */

import { useState } from "react";
import { Edit2, Plus, ShieldCheck, ShieldOff } from "lucide-react";
import DataGrid from "../../controls/ui/data_grid.jsx";
import InputField from "../../controls/ui/input_field.jsx";
import ErrorBanner from "../../controls/ui/error_banner.jsx";
import { useCrudPage } from "../../hooks/use_crud_page.js";
// TODO: reemplazar por las funciones reales del recurso (api/mi_entidad_api.js)
import {
  getEntidades,
  crearEntidad,
  actualizarEntidad,
  cambiarEstadoEntidad,
} from "../../api/_scaffold_entidad_api.js";

/* ── modal de alta/edición ───────────────────────────────────────────────── */

function EntidadFormModal({ abierto, onClose, onGuardar, entidadEditar, guardando }) {
  // TODO: reemplazar por los campos reales. Ejemplo con estado controlado simple
  // (si preferís react-hook-form, mirá staff_form_modal.jsx u otro form del proyecto).
  const [nombre, setNombre] = useState(entidadEditar?.nombre ?? "");

  if (!abierto) return null;

  function submit(e) {
    e.preventDefault();
    onGuardar({ nombre: nombre.trim() });
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {entidadEditar ? "Editar" : "Nueva entidad"}
          </h2>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          {/* TODO: un <InputField> por campo del modelo */}
          <InputField
            label="Nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            hideMessage
            placeholder="Ej: ..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={guardando}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── página ──────────────────────────────────────────────────────────────── */

export default function EntidadPageScaffold() {
  const {
    items, cargando, error,
    modalAbierto, seleccionado, guardando,
    abrirNuevo, abrirEditar, cerrarModal, guardar, ejecutarAccion,
  } = useCrudPage({
    fetchFn: getEntidades,
    createFn: crearEntidad,
    updateFn: actualizarEntidad,
    mensajeErrorCarga: "No se pudo cargar el listado", // TODO: texto del recurso
  });

  function toggleEstado(row) {
    const nuevoEstado = !row.activo;
    const accion = nuevoEstado ? "activar" : "desactivar";
    ejecutarAccion(() => cambiarEstadoEntidad(row.id, nuevoEstado), {
      confirmMessage: `¿Seguro que querés ${accion} "${row.nombre}"?`, // TODO: campo a mostrar
      mensajeError: `No se pudo ${accion}`,
    });
  }

  // TODO: columnas reales — ver DataGrid en data_grid.jsx para todas las opciones (sortable, render, align...)
  const columns = [
    { key: "nombre", label: "Nombre", sortable: true, searchable: true, className: "font-semibold text-slate-800" },
    {
      key: "activo",
      label: "Estado",
      render: (_, val) => (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${val ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
          {val ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
          {val ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  const actions = [
    { key: "editar", label: "Editar", icon: <Edit2 size={12} />, variant: "primary", onClick: abrirEditar },
    { key: "desactivar", label: "Desactivar", icon: <ShieldOff size={12} />, variant: "danger", onClick: toggleEstado, show: (row) => row.activo },
    { key: "activar", label: "Activar", icon: <ShieldCheck size={12} />, variant: "success", onClick: toggleEstado, show: (row) => !row.activo },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">

        {/* ── ENCABEZADO ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* TODO: título y bajada del recurso */}
            <h1 className="text-2xl font-extrabold text-slate-900">Entidades</h1>
            <p className="mt-0.5 text-sm text-slate-500">Descripción corta de qué se administra acá.</p>
          </div>
          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition self-start sm:self-auto"
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>

        {/* ── ERROR ── */}
        <ErrorBanner message={error} />

        {/* ── TABLA ── */}
        <DataGrid
          rows={items}
          columns={columns}
          keyField="id"
          loading={cargando}
          searchable
          searchPlaceholder="Buscar…"
          emptyMessage="No hay registros cargados."
          actions={actions}
          pageSize={20}
          pageSizeOptions={[10, 20, 50]}
        />

      </div>

      <EntidadFormModal
        abierto={modalAbierto}
        onClose={cerrarModal}
        onGuardar={guardar}
        entidadEditar={seleccionado}
        guardando={guardando}
      />
    </div>
  );
}
