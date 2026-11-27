import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FormError from "../../../controls/ui/form_error.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";
import { useToast } from "../../../controls/toast/use_toast.js";
import { mostrarErrores } from "../../../utils/errores.js";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from "../../../controls/ui/estilos.js";
import { Casilla, Encabezado, Pantalla, SegunConsulta, Tarjeta } from "../../../controls/ui/pantalla_panel.jsx";
import { opcionesCategorias } from "../arbol.js";
import { useCategoriasPanel, useGuardarProducto, useProductoPanel } from "../hooks.js";
import FotosField from "./fotos_field.jsx";
import VariantesField from "./variantes_field.jsx";
import { VARIANTE_VACIA, valoresVariante } from "./variantes_valores.js";

const LISTA = "/admin/catalogo/productos";

export default function ProductoFormPage() {
  const { id } = useParams();
  const producto = useProductoPanel(id);
  const categorias = useCategoriasPanel();
  return (
    <Pantalla>
      <Link to={LISTA} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700 hover:underline"><ArrowLeft size={16} aria-hidden="true" /> Productos</Link>
      <Encabezado titulo={id ? "Editar producto" : "Nuevo producto"} />
      <SegunConsulta consulta={categorias} vacia={categorias.data?.length === 0} tituloVacio="Primero creá una categoría" descripcionVacio="Cada producto va dentro de una."
        accionVacio={<Link to="/admin/catalogo/categorias" className={BOTON_PRIMARIO}>Ir a Categorías</Link>}>
        {() => (id
          ? <SegunConsulta consulta={producto}>{() => <Formulario key={producto.data.version} producto={producto.data} categorias={categorias.data} />}</SegunConsulta>
          : <Formulario categorias={categorias.data} />)}
      </SegunConsulta>
    </Pantalla>
  );
}

const valores = (p) => ({
  nombre: p?.nombre ?? "", categoria_id: p ? String(p.categoria_id) : "", descripcion: p?.descripcion ?? "", destacado: p?.destacado ?? false, activo: p?.activo ?? true,
  variantes: p ? p.variantes.map(valoresVariante) : [VARIANTE_VACIA], fotos: p?.fotos ?? [],
});

function Formulario({ producto, categorias }) {
  const toast = useToast();
  const navigate = useNavigate();
  const guardar = useGuardarProducto();
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm({ defaultValues: valores(producto) });

  async function enviar(datos) {
    try {
      toast.success((await guardar.mutateAsync({ ...datos, id: producto?.id, version: producto?.version })).mensaje);
      navigate(LISTA);
    } catch (error) { mostrarErrores(error, setError, "No se pudo guardar el producto."); }
  }
  const errorFotos = errors.fotos?.message ?? errors.fotos?.find?.((e) => e?.message)?.message;

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <Tarjeta>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Nombre" name="nombre" register={register} required requiredMessage="Escribí el nombre del producto." error={errors.nombre?.message} autoComplete="off" className="min-h-11" />
          <SelectField label="Categoría" name="categoria_id" register={register} error={errors.categoria_id?.message} placeholder="Elegí una" options={opcionesCategorias(categorias)} />
          <div className="sm:col-span-2"><TextareaField label="Descripción (opcional)" name="descripcion" register={register} error={errors.descripcion?.message} rows={5} /></div>
        </div>
      </Tarjeta>
      <VariantesField control={control} register={register} errors={errors} />
      <Tarjeta titulo="Fotos">
        <Controller name="fotos" control={control} render={({ field }) => <FotosField value={field.value} onChange={field.onChange} />} />
        {errorFotos && <p role="alert" className="mt-2 text-sm text-red-700">{errorFotos}</p>}
      </Tarjeta>
      <Tarjeta>
        <Casilla name="destacado" register={register} label="Destacado" ayuda="Aparece en el inicio (hasta 8)." />
        <Casilla name="activo" register={register} label="Se ve en la web" />
      </Tarjeta>
      <FormError message={errors.root?.message} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Link to={LISTA} className={BOTON_SECUNDARIO}>Cancelar</Link>
        <button type="submit" disabled={guardar.isPending} className={BOTON_PRIMARIO}>{guardar.isPending ? "Guardando…" : "Guardar producto"}</button>
      </div>
    </form>
  );
}
