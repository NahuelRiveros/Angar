/**
 * PLANTILLA — pantalla del panel "listado + alta/edición + baja", armada con el kit del core
 * (docs/specs/core/componentes.md). No está enrutada: es para copiar al rubro.
 * Ejemplo real más completo: core/opcionales/catalogo/admin/categorias_page.jsx.
 *
 * Cómo usarla:
 *   1. Copiá este archivo a `modules/<rubro>/admin/mi_entidad_page.jsx` y api/_scaffold_entidad_api.js a
 *      `modules/<rubro>/api.js`; los hooks de abajo van a `modules/<rubro>/hooks.js`.
 *   2. Reemplazá cada `// TODO:` (campos, textos, permiso).
 *   3. Registrá la ruta en `rutas.jsx` del rubro con `protegida(<MiEntidadPage />, { permisos: ["entidad.editar"] })`.
 * Colores: solo los del tema (sin bg-[#…]); lo controla tests/core_kit.test.mjs.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import ActionButton from "../../controls/ui/action_button.jsx";
import ConfirmDialog from "../../controls/ui/confirm_dialog.jsx";
import Etiqueta from "../../controls/ui/etiqueta.jsx";
import FilaLista, { Lista } from "../../controls/ui/fila_lista.jsx";
import Formulario from "../../controls/ui/formulario.jsx";
import InputField from "../../controls/ui/input_field.jsx";
import Modal from "../../controls/ui/modal.jsx";
import { Casilla, Encabezado, Pantalla, SegunConsulta } from "../../controls/ui/pantalla_panel.jsx";
import { useToast } from "../../controls/toast/use_toast.js";
import { mensajeError } from "../../utils/errores.js";
import { eliminarEntidad, getEntidades, guardarEntidad } from "../../api/_scaffold_entidad_api.js"; // TODO: ../api.js del rubro

// ── Hooks (TODO: a hooks.js del rubro) ─────────────────────────────────────
const CLAVE = ["entidades"]; // TODO: clave propia del rubro
const useEntidades = () => useQuery({ queryKey: CLAVE, queryFn: getEntidades });
function useAccion(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }) });
}

// ── Pantalla ───────────────────────────────────────────────────────────────
export default function EntidadPageScaffold() {
  const toast = useToast();
  const consulta = useEntidades();
  const eliminar = useAccion(eliminarEntidad);
  const [editando, setEditando] = useState(null); // null cerrado · {} nueva · entidad en edición
  const [aBorrar, setABorrar] = useState(null);

  async function borrar() {
    try { toast.success((await eliminar.mutateAsync(aBorrar.id)).mensaje); }
    catch (error) { toast.error(mensajeError(error, "No se pudo borrar.")); }
    setABorrar(null);
  }

  const nueva = <ActionButton onClick={() => setEditando({})}><Plus size={16} aria-hidden="true" /> Nueva</ActionButton>;
  return (
    <Pantalla>
      {/* TODO: título y bajada del recurso */}
      <Encabezado titulo="Entidades" descripcion="Qué se administra acá, en una frase.">{nueva}</Encabezado>
      <SegunConsulta consulta={consulta} vacia={consulta.data?.length === 0} icono={Tags}
        tituloVacio="Todavía no hay entidades" descripcionVacio="Cargá la primera." accionVacio={nueva}>
        {() => (
          <Lista>
            {consulta.data.map((e) => (
              <FilaLista key={e.id} titulo={e.nombre} etiquetas={!e.activo && <Etiqueta>Oculta</Etiqueta>}
                acciones={<>
                  <ActionButton variante="secundario" onClick={() => setEditando(e)} aria-label={`Editar ${e.nombre}`}><Pencil size={16} aria-hidden="true" /></ActionButton>
                  <ActionButton variante="peligro" onClick={() => setABorrar(e)} aria-label={`Borrar ${e.nombre}`}><Trash2 size={16} aria-hidden="true" /></ActionButton>
                </>} />
            ))}
          </Lista>
        )}
      </SegunConsulta>
      {editando && <EntidadModal entidad={editando} onClose={() => setEditando(null)} />}
      <ConfirmDialog open={Boolean(aBorrar)} title={`¿Borrar "${aBorrar?.nombre ?? ""}"?`} message="No se puede deshacer." confirmLabel="Borrar"
        loading={eliminar.isPending} onConfirm={borrar} onClose={() => setABorrar(null)} />
    </Pantalla>
  );
}

/** Alta y edición. Los errores del servidor (por campo o generales) los muestra <Formulario>. */
function EntidadModal({ entidad, onClose }) {
  const toast = useToast();
  const guardar = useAccion(guardarEntidad);
  // TODO: un valor por campo del modelo (y su esquema Zod con zodResolver si hace falta validar antes).
  const form = useForm({ defaultValues: { nombre: entidad.nombre ?? "", activo: entidad.activo ?? true } });
  const { register, formState: { errors } } = form;

  async function enviar(valores) {
    toast.success((await guardar.mutateAsync({ ...valores, id: entidad.id })).mensaje);
    onClose();
  }
  return (
    <Modal open onClose={onClose} busy={guardar.isPending} title={entidad.id ? "Editar" : "Nueva entidad"}>
      <Formulario form={form} onEnviar={enviar} cancelar={onClose}>
        {/* TODO: un campo del kit por dato (InputField, SelectField, TextareaField, SelectorOpciones…) */}
        <InputField label="Nombre" name="nombre" register={register} error={errors.nombre?.message} autoComplete="off" />
        <Casilla name="activo" register={register} label="Se ve" />
      </Formulario>
    </Modal>
  );
}
