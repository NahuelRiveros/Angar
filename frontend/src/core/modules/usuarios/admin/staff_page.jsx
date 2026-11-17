import { useEffect, useState } from "react";
import StaffFormModal from "../../../controls/modales/staff_form_modal";
import StaffPasswordModal from "../../../controls/modales/staff_password_modal";
import DataGrid from "../../../controls/ui/data_grid";
import {
  obtenerStaff,
  crearStaff,
  actualizarStaff,
  cambiarPasswordStaff,
  cambiarEstadoStaff,
  cambiarRolStaff,
  eliminarStaff,
} from "../../../api/staff_api";
import { Users, UserPlus, Edit2, KeyRound, ShieldCheck, ShieldOff, RefreshCw, Trash2 } from "lucide-react";

function formatearFecha(fecha) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function iniciales(nombre, apellido) {
  return ((String(apellido || "")[0] || "") + (String(nombre || "")[0] || "")).toUpperCase() || "?";
}

export default function StaffPage() {
  const [staff, setStaff]                   = useState([]);
  const [cargando, setCargando]             = useState(true);
  const [error, setError]                   = useState("");
  const [modalFormAbierto, setModalFormAbierto]         = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [staffSeleccionado, setStaffSeleccionado]       = useState(null);
  const [guardando, setGuardando]           = useState(false);
  const [errorAccion, setErrorAccion]       = useState("");

  async function cargarStaff() {
    try {
      setCargando(true);
      setError("");
      const resp = await obtenerStaff();
      setStaff(resp.data || []);
    } catch (err) {
      setError(err?.response?.data?.mensaje || "No se pudo cargar el staff");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarStaff(); }, []);

  function abrirNuevo()           { setStaffSeleccionado(null); setModalFormAbierto(true); }
  function abrirEditar(usuario)   { setStaffSeleccionado(usuario); setModalFormAbierto(true); }
  function abrirPassword(usuario) { setStaffSeleccionado(usuario); setModalPasswordAbierto(true); }
  function cerrarFormModal()      { setModalFormAbierto(false); setStaffSeleccionado(null); }
  function cerrarPasswordModal()  { setModalPasswordAbierto(false); setStaffSeleccionado(null); }

  async function guardarStaff(payload) {
    try {
      setGuardando(true);
      setErrorAccion("");
      if (staffSeleccionado?.gym_usuario_id) {
        const { rol_codigo, ...datos } = payload;
        await actualizarStaff(staffSeleccionado.gym_usuario_id, datos);
        if (rol_codigo && rol_codigo !== staffSeleccionado.rol_codigo) {
          await cambiarRolStaff(staffSeleccionado.gym_usuario_rol_id, rol_codigo);
        }
      } else {
        await crearStaff(payload);
      }
      cerrarFormModal();
      await cargarStaff();
    } catch (err) {
      setErrorAccion(err?.response?.data?.mensaje || "No se pudo guardar el staff");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarUsuario(usuario) {
    if (!window.confirm(`¿Eliminar definitivamente a ${usuario.gym_persona_nombre} ${usuario.gym_persona_apellido}? Esta acción no se puede deshacer.`)) return;
    try {
      setErrorAccion("");
      await eliminarStaff(usuario.gym_usuario_id);
      await cargarStaff();
    } catch (err) {
      setErrorAccion(err?.response?.data?.mensaje || "No se pudo eliminar el usuario");
    }
  }

  async function guardarPassword(payload) {
    try {
      setGuardando(true);
      setErrorAccion("");
      await cambiarPasswordStaff(staffSeleccionado.gym_usuario_id, payload.password);
      cerrarPasswordModal();
      await cargarStaff();
    } catch (err) {
      setErrorAccion(err?.response?.data?.mensaje || "No se pudo cambiar la contraseña");
    } finally {
      setGuardando(false);
    }
  }

  async function toggleEstado(usuario) {
    const nuevoEstado = !usuario.gym_usuario_activo;
    const accion = nuevoEstado ? "activar" : "desactivar";
    if (!window.confirm(`¿Seguro que querés ${accion} a ${usuario.gym_persona_nombre} ${usuario.gym_persona_apellido}?`)) return;
    try {
      setErrorAccion("");
      await cambiarEstadoStaff(usuario.gym_usuario_id, nuevoEstado);
      await cargarStaff();
    } catch (err) {
      setErrorAccion(err?.response?.data?.mensaje || `No se pudo ${accion} el staff`);
    }
  }

  const activos   = staff.filter((u) => u.gym_usuario_activo).length;
  const inactivos = staff.length - activos;

  const columns = [
    {
      key: "gym_persona_apellido",
      label: "Nombre",
      sortable: true,
      searchable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-sm ${row.gym_usuario_activo ? "bg-blue-600 shadow-blue-500/30" : "bg-slate-400"}`}>
            {iniciales(row.gym_persona_nombre, row.gym_persona_apellido)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight">
              {row.gym_persona_apellido} {row.gym_persona_nombre}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "rol_descripcion",
      label: "Rol",
      render: (row) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
          row.rol_codigo === "admin" ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
        }`}>
          {row.rol_descripcion || "—"}
        </span>
      ),
    },
    {
      key: "gym_usuario_nombre_usuario",
      label: "Usuario",
      searchable: true,
      render: (_, val) => (val ? <span className="font-mono text-xs text-slate-700">{val}</span> : <span className="text-slate-400">—</span>),
    },
    {
      key: "gym_persona_email",
      label: "Email",
      searchable: true,
      className: "text-slate-500 hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
    },
    {
      key: "gym_persona_documento",
      label: "DNI",
      sortable: true,
      searchable: true,
      className: "text-slate-600 hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "gym_usuario_activo",
      label: "Estado",
      render: (_, val) => (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${val ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
          {val ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
          {val ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "gym_usuario_ultimo_login",
      label: "Último login",
      className: "text-slate-500 text-xs hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      render: (_, val) => formatearFecha(val),
    },
  ];

  const actions = [
    {
      key: "editar",
      label: "Editar",
      icon: <Edit2 size={12} />,
      variant: "primary",
      onClick: (row) => abrirEditar(row),
    },
    {
      key: "password",
      label: "Contraseña",
      icon: <KeyRound size={12} />,
      variant: "default",
      onClick: (row) => abrirPassword(row),
    },
    {
      key: "desactivar",
      label: "Desactivar",
      icon: <ShieldOff size={12} />,
      variant: "danger",
      onClick: (row) => toggleEstado(row),
      show: (row) => row.gym_usuario_activo,
    },
    {
      key: "activar",
      label: "Activar",
      icon: <ShieldCheck size={12} />,
      variant: "success",
      onClick: (row) => toggleEstado(row),
      show: (row) => !row.gym_usuario_activo,
    },
    {
      key: "eliminar",
      label: "Eliminar",
      icon: <Trash2 size={12} />,
      variant: "danger",
      onClick: (row) => eliminarUsuario(row),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">

        {/* ── ENCABEZADO ── */}
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-500/10">
          <div className="h-1 w-full bg-linear-to-r from-blue-600 via-blue-500 to-cyan-400" />
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm shadow-blue-500/30">
                <Users size={11} />
                Admin
              </span>
              <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Personal</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Administrá al personal (staff y admins), sus datos, contraseña y estado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button" onClick={cargarStaff} disabled={cargando}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={13} className={cargando ? "animate-spin" : ""} />
              </button>
              <button
                type="button" onClick={abrirNuevo}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition"
              >
                <UserPlus size={14} /> Nuevo integrante
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total personal" value={String(staff.length)} highlight />
          <StatCard label="Activos"      value={String(activos)}      green />
          <StatCard label="Inactivos"    value={String(inactivos)} />
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {errorAccion && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorAccion}</div>
        )}

        {/* ── TABLA ── */}
        <DataGrid
          rows={staff}
          columns={columns}
          keyField="gym_usuario_id"
          loading={cargando}
          searchable
          searchPlaceholder="Buscar por nombre, usuario, email o DNI…"
          emptyMessage="No hay staff cargado."
          actions={actions}
          actionsLabel="Acciones"
          actionsPosition="end"
          pageSize={15}
          pageSizeOptions={[10, 15, 25]}
        />

      </div>

      <StaffFormModal
        abierto={modalFormAbierto}
        onClose={cerrarFormModal}
        onGuardar={guardarStaff}
        staffEditar={staffSeleccionado}
        cargando={guardando}
      />

      <StaffPasswordModal
        abierto={modalPasswordAbierto}
        onClose={cerrarPasswordModal}
        onGuardar={guardarPassword}
        staffSeleccionado={staffSeleccionado}
        cargando={guardando}
      />
    </div>
  );
}

function StatCard({ label, value, highlight, green }) {
  return (
    <div className={[
      "rounded-2xl border px-4 py-3.5 shadow-sm",
      highlight ? "border-blue-200 bg-linear-to-br from-blue-600 to-blue-500 shadow-blue-500/20"
        : green  ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-white",
    ].join(" ")}>
      <div className={`text-[11px] font-bold uppercase tracking-wider ${highlight ? "text-blue-100" : green ? "text-emerald-600" : "text-slate-500"}`}>
        {label}
      </div>
      <p className={`mt-1.5 text-2xl font-extrabold leading-tight ${highlight ? "text-white" : green ? "text-emerald-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
