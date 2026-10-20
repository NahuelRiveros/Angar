import { useEffect, useState } from "react";
import { Shield, RefreshCw, AlertTriangle, CheckCircle, ShoppingCart, Boxes } from "lucide-react";
import { getModulosNegocio, actualizarModuloNegocio } from "../../../api/modulos_api.js";

// Módulo sin ícono acá (código nuevo todavía no agregado) → usa Shield, el
// mismo ícono genérico del header de esta página (ver ICONOS[...] ?? Shield).
const ICONOS = { eccomerce_distribuidora: Boxes, stock: ShoppingCart };

export default function GestionModulosPage() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [actualizando, setActualizando] = useState(null);

  async function cargar() {
    try {
      setCargando(true);
      setError("");
      const r = await getModulosNegocio();
      if (!r?.ok) { setError(r?.mensaje || "No se pudo cargar el listado"); return; }
      setItems(r.items || []);
    } catch (e) {
      setError(e?.response?.data?.mensaje || "No se pudo cargar el listado");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function toggle(modulo) {
    const nuevoEstado = !modulo.habilitado;
    const accion = nuevoEstado ? "habilitar" : "deshabilitar";
    if (!window.confirm(`¿Seguro que querés ${accion} "${modulo.descripcion}"? Esto afecta a toda la instalación, incluido el acceso de admin.`)) return;
    try {
      setActualizando(modulo.codigo);
      setError(""); setExito("");
      const r = await actualizarModuloNegocio(modulo.codigo, nuevoEstado);
      if (!r?.ok) { setError(r?.mensaje || `No se pudo ${accion} el módulo`); return; }
      setExito(r.mensaje);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.mensaje || `No se pudo ${accion} el módulo`);
    } finally {
      setActualizando(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-4">

        <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-500/10">
          <div className="h-1 w-full bg-linear-to-r from-violet-600 via-violet-500 to-fuchsia-400" />
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm shadow-violet-500/30">
                <Shield size={11} />
                Super Admin
              </span>
              <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Módulos habilitados</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Qué módulos de negocio tiene comprados esta instalación de Moovs.
              </p>
            </div>
            <button
              type="button"
              onClick={cargar}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={13} className={cargando ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} className="shrink-0" />
            {error}
          </div>
        )}
        {exito && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle size={15} className="shrink-0" />
            {exito}
          </div>
        )}

        {cargando ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-sm">
            Cargando módulos…
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((modulo) => {
              const Icono = ICONOS[modulo.codigo] ?? Shield;
              return (
                <div
                  key={modulo.codigo}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${modulo.habilitado ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                      <Icono size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{modulo.descripcion}</p>
                      <p className="text-xs text-slate-500">
                        {modulo.habilitado ? "Habilitado — accesible en el sistema" : "Deshabilitado — bloqueado incluso para admin"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={modulo.habilitado}
                    onClick={() => toggle(modulo)}
                    disabled={actualizando === modulo.codigo}
                    className={`relative h-7 w-13 shrink-0 rounded-full transition-colors disabled:opacity-50 ${modulo.habilitado ? "bg-emerald-500" : "bg-rose-400"}`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${modulo.habilitado ? "translate-x-6" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
