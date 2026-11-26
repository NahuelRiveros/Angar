import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import InputField from "../../../controls/ui/input_field.jsx";
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from "../../comun/estilos.js";
import { Casilla, Tarjeta } from "../../comun/piezas_panel.jsx";
import { VARIANTE_VACIA } from "./variantes_valores.js";

const MAX_VARIANTES = 50;

/** MCA-02: con una sola opción se ven el precio y el código; al agregar otra, cada una pide su nombre. */
export default function VariantesField({ control, register, errors }) {
  // `keyName`: sin esto React Hook Form pisaría el `id` de la variante con el suyo.
  const { fields, append, remove } = useFieldArray({ control, name: "variantes", keyName: "clave" });
  const varias = fields.length > 1;
  const errorGeneral = errors.variantes?.message ?? errors.variantes?.root?.message;
  return (
    <Tarjeta titulo={varias ? "Opciones y precios" : "Precio"}>
      <div className="space-y-4">
        {fields.map((campo, i) => {
          const de = (nombre) => ({ name: `variantes.${i}.${nombre}`, register, error: errors.variantes?.[i]?.[nombre]?.message, autoComplete: "off", className: "min-h-11" });
          return (
            <fieldset key={campo.clave} className={varias ? "min-w-0 rounded-xl border border-slate-200 p-3 sm:p-4" : "min-w-0"}>
              {varias && <legend className="px-1 text-sm font-bold text-slate-700">Opción {i + 1}</legend>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {varias && <InputField label="Nombre" placeholder="Ej: Talle M, Rojo, 1 litro" {...de("nombre")} />}
                <InputField label="Precio" type="number" min={0} step="0.01" inputMode="decimal" helperText="Vacío: «Consultar precio»." {...de("precio")} />
                <InputField label="Precio anterior" type="number" min={0} step="0.01" inputMode="decimal" helperText="Opcional: se ve tachado." {...de("precio_anterior")} />
                <InputField label="Código (opcional)" {...de("codigo")} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {campo.disponible_por
                  ? <p className="py-2 text-sm text-slate-600">{campo.disponible ? "Hay stock" : "Sin stock"}: lo calcula {campo.disponible_por === "stock" ? "Stock con la cantidad cargada" : campo.disponible_por}.</p>
                  : <Casilla name={`variantes.${i}.disponible`} register={register} label="Hay stock" />}
                {varias && <button type="button" onClick={() => remove(i)} aria-label={`Quitar opción ${i + 1}`} className={BOTON_PELIGRO}><Trash2 size={16} aria-hidden="true" /> Quitar</button>}
              </div>
            </fieldset>
          );
        })}
        {errorGeneral && <p role="alert" className="text-sm text-red-700">{errorGeneral}</p>}
        {fields.length < MAX_VARIANTES && (
          <button type="button" onClick={() => append(VARIANTE_VACIA)} className={BOTON_SECUNDARIO}><Plus size={16} aria-hidden="true" /> Agregar opción (talle, color, tamaño…)</button>
        )}
      </div>
    </Tarjeta>
  );
}
