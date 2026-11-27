import { useState } from "react";
import { useForm } from "react-hook-form";
import { CornerDownRight, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import FormError from "../../../controls/ui/form_error.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { useToast } from "../../../controls/toast/use_toast.js";
import { mensajeError, mostrarErrores } from "../../../utils/errores.js";
import { BOTON_PELIGRO, BOTON_PRIMARIO, BOTON_SECUNDARIO } from "../../../controls/ui/estilos.js";
import { Casilla, Encabezado, Pantalla, SegunConsulta } from "../../../controls/ui/pantalla_panel.jsx";
import { arbolCategorias } from "../arbol.js";
import { useCategoriasPanel, useEliminarCategoria, useGuardarCategoria } from "../hooks.js";

export default function CategoriasPage() {
  const toast = useToast();
  const consulta = useCategoriasPanel();
  const eliminar = useEliminarCategoria();
  const [editando, setEditando] = useState(null); // null cerrado · {} nueva · categoría edición
  const [aBorrar, setABorrar] = useState(null);
  const arbol = arbolCategorias(consulta.data);

  async function borrar() {
    try { toast.success((await eliminar.mutateAsync(aBorrar.id)).mensaje); }
    catch (error) { toast.error(mensajeError(error, "No se pudo borrar.")); }
    setABorrar(null);
  }

  const fila = (c, esHija) => (
    <li key={c.id} className={`flex items-center gap-2 py-2 pr-3 ${esHija ? "pl-8" : "pl-4"}`}>
      {esHija && <CornerDownRight size={16} aria-hidden="true" className="shrink-0 text-slate-400" />}
      <span className={`min-w-0 flex-1 ${esHija ? "" : "font-semibold"} ${c.activo ? "" : "text-slate-500"}`}>{c.nombre}{!c.activo && " (oculta)"}</span>
      {!esHija && <button type="button" onClick={() => setEditando({ padre_id: c.id })} aria-label={`Agregar subcategoría a ${c.nombre}`} className={BOTON_SECUNDARIO}><Plus size={16} aria-hidden="true" /></button>}
      <button type="button" onClick={() => setEditando(c)} aria-label={`Editar ${c.nombre}`} className={BOTON_SECUNDARIO}><Pencil size={16} aria-hidden="true" /></button>
      <button type="button" onClick={() => setABorrar(c)} aria-label={`Borrar ${c.nombre}`} className={BOTON_PELIGRO}><Trash2 size={16} aria-hidden="true" /></button>
    </li>
  );

  return (
    <Pantalla>
      <Encabezado titulo="Categorías" descripcion="Cómo se agrupan los productos en la web. Podés tener dos niveles."><button type="button" onClick={() => setEditando({})} className={BOTON_PRIMARIO}><Plus size={16} aria-hidden="true" /> Nueva categoría</button></Encabezado>
      <SegunConsulta consulta={consulta} vacia={arbol.length === 0} icono={FolderTree} tituloVacio="No hay categorías" descripcionVacio="Creá una para poder cargar productos.">
        {() => <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">{arbol.flatMap((c) => [fila(c, false), ...c.hijas.map((h) => fila(h, true))])}</ul>}
      </SegunConsulta>
      {editando && <CategoriaModal categoria={editando} arbol={arbol} onClose={() => setEditando(null)} />}
      <ConfirmDialog open={Boolean(aBorrar)} title={`¿Borrar "${aBorrar?.nombre ?? ""}"?`} message="Solo se puede borrar si no tiene subcategorías y nunca tuvo productos." confirmLabel="Borrar" loading={eliminar.isPending} onConfirm={borrar} onClose={() => setABorrar(null)} />
    </Pantalla>
  );
}

function CategoriaModal({ categoria, arbol, onClose }) {
  const toast = useToast();
  const guardar = useGuardarCategoria();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: { nombre: categoria.nombre ?? "", padre_id: categoria.padre_id ? String(categoria.padre_id) : "", orden: categoria.orden ?? 0, activo: categoria.activo ?? true },
  });
  const tieneHijas = arbol.some((c) => c.id === categoria.id && c.hijas.length > 0);
  const padres = arbol.filter((c) => c.id !== categoria.id).map((c) => ({ value: c.id, label: c.nombre }));

  async function enviar(valores) {
    try { toast.success((await guardar.mutateAsync({ ...valores, id: categoria.id })).mensaje); onClose(); }
    catch (error) { mostrarErrores(error, setError, "No se pudo guardar."); }
  }
  return (
    <Modal open onClose={onClose} busy={guardar.isPending} title={categoria.id ? "Editar categoría" : "Nueva categoría"}>
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
        <InputField label="Nombre" name="nombre" register={register} error={errors.nombre?.message} autoComplete="off" />
        {!tieneHijas && padres.length > 0 && <SelectField label="Dentro de (opcional)" name="padre_id" register={register} error={errors.padre_id?.message} placeholder="Ninguna: es del primer nivel" options={padres} />}
        <InputField label="Orden" name="orden" type="number" min={0} register={register} error={errors.orden?.message} helperText="Los números más chicos van primero." />
        <Casilla name="activo" register={register} label="Se ve en la web" ayuda="Si la ocultás, sus productos tampoco se ven." />
        <FormError message={errors.root?.message} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={BOTON_SECUNDARIO}>Cancelar</button>
          <button type="submit" disabled={guardar.isPending} className={BOTON_PRIMARIO}>{guardar.isPending ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}
