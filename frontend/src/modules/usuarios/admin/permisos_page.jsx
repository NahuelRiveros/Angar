import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { crearRol, eliminarRol, getPermisos, guardarPermisosRol } from "../../../api/permisos_api.js";
import { conRequeridos, dependientesDe } from "../../../../../permisos_config.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const personas = (n) => (n === 1 ? "1 persona" : `${n} personas`);
const mismos = (a, b) => a.length === b.length && a.every((p) => b.includes(p));

export default function PermisosPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { recargarUsuario } = useAuth();
  const consulta = useQuery({ queryKey: ["permisos"], queryFn: getPermisos });
  // Cambios sin guardar: { [rolId]: ["contenido.editar", ...] }. Se guardan todos juntos.
  const [borrador, setBorrador] = useState({});
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [aBorrar, setABorrar] = useState(null);
  // En el celular se edita un rol a la vez (la grilla no entra en 320 px).
  const [rolMovilId, setRolMovilId] = useState(null);

  const roles = consulta.data?.roles ?? [];
  const permisosDe = (rol) => borrador[rol.id] ?? rol.permisos;
  const cambiados = roles.filter((rol) => borrador[rol.id] && !mismos(borrador[rol.id], rol.permisos));

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["permisos"] });
    // Si se tocó el rol propio, el menú tiene que reflejarlo sin volver a iniciar sesión.
    await recargarUsuario?.().catch(() => {});
  };
  const guardar = useMutation({
    mutationFn: () => Promise.all(cambiados.map((rol) => guardarPermisosRol(rol.id, borrador[rol.id]))),
    onSuccess: async () => { toast.success("Permisos guardados"); setBorrador({}); await refrescar(); },
  });
  const crear = useMutation({
    mutationFn: () => crearRol(nombreNuevo),
    onSuccess: async (r) => { toast.success(`Rol "${r.data.nombre}" creado: tildá sus permisos y guardá.`); setNombreNuevo(""); await refrescar(); },
  });
  const borrar = useMutation({
    mutationFn: (rol) => eliminarRol(rol.id),
    onSuccess: async () => { toast.success("Rol eliminado"); setABorrar(null); await refrescar(); },
    onError: (error) => { toast.error(mensajeDe(error, "No se pudo eliminar el rol.")); setABorrar(null); },
  });

  // Tildar uno suma lo que requiere; destildar uno saca lo que depende de él (quedaría sin pantalla).
  function alternar(rol, codigo) {
    const actuales = permisosDe(rol);
    const quitar = [codigo, ...dependientesDe(codigo)];
    const siguiente = actuales.includes(codigo) ? actuales.filter((p) => !quitar.includes(p)) : conRequeridos([...actuales, codigo]);
    setBorrador((previo) => ({ ...previo, [rol.id]: siguiente }));
  }

  if (consulta.isPending) return <div className="p-6"><AdminSpinner /></div>;
  if (consulta.isError) {
    return <div className="mx-auto max-w-6xl space-y-3 p-3 sm:p-6">
      <ErrorBanner message={mensajeDe(consulta.error, "No pudimos cargar los permisos.")} />
      <button type="button" onClick={() => consulta.refetch()} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Reintentar</button>
    </div>;
  }

  const { grupos, permisos } = consulta.data;
  const rolMovil = roles.find((r) => r.id === rolMovilId) ?? roles.find((r) => r.editable) ?? roles[0];
  return <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
    <div>
      <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Roles y permisos</h1>
      <p className="text-sm text-(--kt-ink-soft)">Tildá qué puede hacer cada rol. El administrador tiene todo siempre. Los cambios rigen apenas los guardás, sin volver a iniciar sesión.</p>
    </div>

    <form className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-end"
      onSubmit={(e) => { e.preventDefault(); if (!crear.isPending) crear.mutate(); }}>
      <div className="min-w-0 flex-1">
        <InputField label="Nuevo rol" placeholder="Ej: Repositor" value={nombreNuevo} maxLength={40} onChange={(e) => setNombreNuevo(e.target.value)} disabled={crear.isPending}
          error={crear.isError ? mensajeDe(crear.error, "No se pudo crear el rol.") : undefined} />
      </div>
      <button type="submit" disabled={crear.isPending || nombreNuevo.trim().length < 3} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>
        <Plus size={16} /> {crear.isPending ? "Creando…" : "Crear rol"}
      </button>
    </form>

    {rolMovil && <VistaPorRol rol={rolMovil} roles={roles} grupos={grupos} permisos={permisos} permisosDe={permisosDe} onAlternar={alternar}
      onElegir={setRolMovilId} onBorrar={setABorrar} deshabilitado={guardar.isPending} />}

    {/* Desde tablets, la grilla completa; si hay muchos roles se desplaza de costado dentro de su caja. */}
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">Permisos de cada rol</caption>
        <thead>
          <tr className="border-b border-slate-200 align-bottom">
            <th scope="col" className="sticky left-0 z-10 bg-white p-3 text-left font-semibold">Permiso</th>
            {roles.map((rol) => <th key={rol.id} scope="col" className="min-w-28 p-3 text-center font-semibold">
              <span className="block">{rol.nombre}</span>
              <span className="block text-xs font-normal text-slate-500">{rol.editable ? personas(rol.usuarios) : <span className="inline-flex items-center gap-1"><Lock size={12} aria-hidden="true" /> Todos</span>}</span>
              {rol.borrable && <BotonBorrar rol={rol} onBorrar={setABorrar} />}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => <GrupoFilas key={grupo.codigo} grupo={grupo} permisos={permisos.filter((p) => p.grupo === grupo.codigo)} roles={roles}
            permisosDe={permisosDe} onAlternar={alternar} deshabilitado={guardar.isPending} columnas={roles.length + 1} />)}
        </tbody>
      </table>
    </div>

    {/* Pegada abajo dentro del contenido: no tapa el menú lateral del panel. */}
    {cambiados.length > 0 && <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold" role="status">Cambios sin guardar en {cambiados.map((r) => r.nombre).join(", ")}</p>
        {guardar.isError && <p role="alert" className="w-full text-sm text-red-700">{mensajeDe(guardar.error, "No se pudieron guardar los permisos. Reintentá.")}</p>}
        <div className="flex gap-2">
          <button type="button" disabled={guardar.isPending} onClick={() => { setBorrador({}); guardar.reset(); }} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Descartar</button>
          <button type="button" disabled={guardar.isPending} onClick={() => guardar.mutate()} className={`${BOTON} bg-(--kt-petrol) text-white hover:bg-(--kt-night)`}>{guardar.isPending ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </div>
    </div>}

    <ConfirmDialog open={Boolean(aBorrar)} title={`¿Eliminar el rol "${aBorrar?.nombre}"?`} loading={borrar.isPending}
      message="Se borra el rol y sus permisos. No afecta a nadie porque no tiene personas asignadas."
      confirmLabel="Eliminar" onClose={() => setABorrar(null)} onConfirm={() => borrar.mutate(aBorrar)} />
  </div>;
}

function GrupoFilas({ grupo, permisos, roles, permisosDe, onAlternar, deshabilitado, columnas }) {
  return <>
    <tr className="bg-slate-50"><th colSpan={columnas} scope="colgroup" className="p-2 px-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{grupo.nombre}</th></tr>
    {permisos.map((permiso) => <tr key={permiso.codigo} className="border-b border-slate-100">
      <th scope="row" className="sticky left-0 z-10 max-w-56 bg-white p-3 text-left font-normal sm:max-w-80">
        <span className="block font-semibold">{permiso.nombre}</span>
        <span className="block text-xs text-slate-500">{permiso.descripcion}</span>
      </th>
      {roles.map((rol) => <td key={rol.id} className="p-1 text-center">
        <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl hover:bg-slate-100 has-disabled:cursor-not-allowed has-disabled:hover:bg-transparent">
          <input type="checkbox" className="h-5 w-5 accent-(--kt-teal-700)" checked={permisosDe(rol).includes(permiso.codigo)}
            disabled={!rol.editable || deshabilitado} onChange={() => onAlternar(rol, permiso.codigo)}
            aria-label={`${permiso.nombre} para ${rol.nombre}`} />
        </label>
      </td>)}
    </tr>)}
  </>;
}

function BotonBorrar({ rol, onBorrar }) {
  return <button type="button" onClick={() => onBorrar(rol)} disabled={rol.usuarios > 0}
    aria-label={rol.usuarios ? `No se puede eliminar ${rol.nombre}: tiene personas asignadas` : `Eliminar el rol ${rol.nombre}`}
    title={rol.usuarios ? "Tiene personas asignadas: cambiales el rol en Personal para poder eliminarlo" : "Eliminar rol"}
    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"><Trash2 size={16} /></button>;
}

function VistaPorRol({ rol, roles, grupos, permisos, permisosDe, onAlternar, onElegir, onBorrar, deshabilitado }) {
  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 md:hidden">
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <SelectField label="Rol a editar" name="rol-movil" showPlaceholderOption={false} value={String(rol.id)} onChange={(e) => onElegir(Number(e.target.value))}
          options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))} />
      </div>
      {rol.borrable && <BotonBorrar rol={rol} onBorrar={onBorrar} />}
    </div>
    <p className="text-xs text-slate-500">{rol.editable ? personas(rol.usuarios) + " con este rol." : "Tiene todos los permisos siempre: no se edita."}</p>
    {grupos.map((grupo) => <fieldset key={grupo.codigo} className="space-y-1">
      <legend className="pb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{grupo.nombre}</legend>
      {permisos.filter((p) => p.grupo === grupo.codigo).map((permiso) => <label key={permiso.codigo} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-slate-50 has-disabled:cursor-not-allowed">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-(--kt-teal-700)" checked={permisosDe(rol).includes(permiso.codigo)}
          disabled={!rol.editable || deshabilitado} onChange={() => onAlternar(rol, permiso.codigo)} aria-label={`${permiso.nombre} para ${rol.nombre}`} />
        <span className="min-w-0"><span className="block text-sm font-semibold">{permiso.nombre}</span><span className="block text-xs text-slate-500">{permiso.descripcion}</span></span>
      </label>)}
    </fieldset>)}
  </div>;
}
