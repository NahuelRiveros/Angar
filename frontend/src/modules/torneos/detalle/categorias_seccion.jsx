import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { NIVELES, RAMAS, PUESTOS, LIMITES, ZONAS, FORMATOS_PARTIDO, nombreNivel, cuposConZonasIguales } from "../../../../../torneo_config.js";
import { crearCategoria, actualizarCategoria, eliminarCategoria } from "../api/torneos_api.js";
import { useCambioTorneo, mensajeDe } from "./use_cambio_torneo.js";
import PremiosModal from "./premios_modal.jsx";
import { CalculoLlave, ResumenLlave, SelectorCupo } from "./calculo_llave.jsx";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const OPCIONES_NIVEL = NIVELES.map((n) => ({ value: String(n), label: nombreNivel(n) }));
const OPCIONES_RAMA = Object.entries(RAMAS).map(([value, label]) => ({ value, label }));
const OPCIONES_TAMANIO = ZONAS.parejasPorZona.map((n) => ({ value: String(n), label: `${n} parejas` }));
const OPCIONES_CLASIFICAN = ZONAS.clasificanPorZona.map((n) => ({ value: String(n), label: n === 1 ? "La primera" : `Las ${n} primeras` }));
const OPCIONES_FORMATO = Object.entries(FORMATOS_PARTIDO).map(([value, f]) => ({ value, label: f.etiqueta }));

// Mismas reglas que valida el servidor (torneo_reglas.js); acá solo para avisar antes de enviar.
const esquema = z.object({
  modo: z.enum(["lista", "propio"]),
  nivel: z.string(),
  rama: z.string(),
  nombre_personalizado: z.string().trim().max(60, "Hasta 60 caracteres."),
  cupo_opcion: z.string(),
  cupo_otro: z.string().trim(),
  parejas_por_zona: z.string(),
  clasifican_por_zona: z.string(),
  formato_zona: z.string(),
  formato_llave: z.string(),
}).superRefine((d, ctx) => {
  if (Number(d.clasifican_por_zona) >= Number(d.parejas_por_zona)) ctx.addIssue({ code: "custom", path: ["clasifican_por_zona"], message: "Tienen que clasificar menos parejas de las que juegan." });
  if (d.modo === "propio" && d.nombre_personalizado.length < 2) ctx.addIssue({ code: "custom", path: ["nombre_personalizado"], message: "Escribí el nombre (mínimo 2 caracteres)." });
  if (d.modo === "lista" && !d.nivel) ctx.addIssue({ code: "custom", path: ["nivel"], message: "Elegí el nivel." });
  if (d.modo === "lista" && !d.rama) ctx.addIssue({ code: "custom", path: ["rama"], message: "Elegí la rama." });
  const otro = Number(d.cupo_otro);
  if (d.cupo_opcion === "otro" && !(Number.isInteger(otro) && otro >= LIMITES.cupoMinimo && otro <= LIMITES.cupoMaximo)) {
    ctx.addIssue({ code: "custom", path: ["cupo_otro"], message: `Entre ${LIMITES.cupoMinimo} y ${LIMITES.cupoMaximo} parejas.` });
  }
});

// "otro" toma el número escrito; "" es sin cupo.
const cupoDe = (d) => (d.cupo_opcion === "otro" ? d.cupo_otro : d.cupo_opcion);
const aCuerpo = (d) => ({
  ...(d.modo === "propio" ? { nombre_personalizado: d.nombre_personalizado } : { nivel: Number(d.nivel), rama: d.rama }),
  cupo_parejas: cupoDe(d) === "" ? null : Number(cupoDe(d)),
  parejas_por_zona: Number(d.parejas_por_zona), clasifican_por_zona: Number(d.clasifican_por_zona), formato_zona: d.formato_zona, formato_llave: d.formato_llave,
});
const formatoDe = (c) => {
  const f = { ...ZONAS.predeterminado, ...c };
  return { parejas_por_zona: String(f.parejas_por_zona), clasifican_por_zona: String(f.clasifican_por_zona), formato_zona: f.formato_zona, formato_llave: f.formato_llave };
};
// Un cupo guardado que no está en la lista de zonas iguales se muestra como "Otro número".
const cupoInicial = (c) => {
  if (!c?.cupo_parejas) return { cupo_opcion: "", cupo_otro: "" };
  const enLista = cuposConZonasIguales(c.parejas_por_zona ?? ZONAS.predeterminado.parejas_por_zona).includes(c.cupo_parejas);
  return enLista ? { cupo_opcion: String(c.cupo_parejas), cupo_otro: "" } : { cupo_opcion: "otro", cupo_otro: String(c.cupo_parejas) };
};
const valoresDe = (c) => c
  ? { modo: c.nombre_personalizado ? "propio" : "lista", nivel: c.nivel ? String(c.nivel) : "", rama: c.rama ?? "", nombre_personalizado: c.nombre_personalizado ?? "", ...cupoInicial(c), ...formatoDe(c) }
  : { modo: "lista", nivel: "", rama: "", nombre_personalizado: "", ...cupoInicial(null), ...formatoDe({}) };

export default function CategoriasSeccion({ torneo, editarCategorias, editarPremios }) {
  const [formulario, setFormulario] = useState(null); // { categoria } — null cerrado, categoria null = nueva
  const [premios, setPremios] = useState(null);
  const [aQuitar, setAQuitar] = useState(null);
  const quitar = useCambioTorneo(torneo.id, (c) => eliminarCategoria(torneo.id, c.id), { onExito: () => setAQuitar(null) });
  const lleno = torneo.categorias.length >= LIMITES.categoriasPorTorneo;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-(--kt-ink-soft)">
          {editarCategorias ? "Cada categoría juega sus propias zonas y llaves." : "Con el torneo en este estado las categorías ya no se cambian; los premios sí."}
        </p>
        {editarCategorias && (
          <button type="button" disabled={lleno} onClick={() => setFormulario({ categoria: null })} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>
            <Plus size={16} aria-hidden="true" /> Agregar categoría
          </button>
        )}
      </div>

      {torneo.categorias.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">
          Todavía no hay categorías. Agregá al menos una para abrir la inscripción.
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {torneo.categorias.map((c) => (
          <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-(--kt-ink)">{c.nombre}</h3>
              <span className="shrink-0 text-xs font-semibold text-(--kt-ink-soft)">{c.cupo_parejas ? `Cupo: ${c.cupo_parejas} parejas` : "Sin cupo"}</span>
            </div>
            <p className="mt-1 text-xs text-(--kt-ink-soft)">Zonas de {c.parejas_por_zona}, clasifican {c.clasifican_por_zona} · {FORMATOS_PARTIDO[c.formato_zona]?.etiqueta}</p>
            <p className="text-xs text-(--kt-ink-soft)">Llave: {FORMATOS_PARTIDO[c.formato_llave]?.etiqueta}</p>
            {c.cupo_parejas && <ResumenLlave cantidad={c.cupo_parejas} parejasPorZona={c.parejas_por_zona} clasifican={c.clasifican_por_zona} className="mt-1" />}
            {c.premios.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {c.premios.map((p) => (
                  <li key={p.id} className="flex gap-1.5"><Award size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600" />
                    <span><strong>{p.puesto === "otro" ? p.etiqueta : PUESTOS[p.puesto]}:</strong> {p.descripcion}</span></li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-(--kt-ink-soft)">Sin premios cargados.</p>}
            {(editarCategorias || editarPremios) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {editarPremios && <button type="button" onClick={() => setPremios(c)} className={`${BOTON} border-amber-200 bg-amber-50 text-amber-900`}><Award size={15} aria-hidden="true" /> Premios</button>}
                {editarCategorias && <button type="button" onClick={() => setFormulario({ categoria: c })} aria-label={`Editar ${c.nombre}`} className={`${BOTON} border-slate-300 bg-white text-slate-700`}><Pencil size={15} aria-hidden="true" /> Editar</button>}
                {editarCategorias && <button type="button" onClick={() => setAQuitar(c)} aria-label={`Quitar ${c.nombre}`} className={`${BOTON} border-red-200 bg-red-50 text-red-800`}><Trash2 size={15} aria-hidden="true" /> Quitar</button>}
              </div>
            )}
          </li>
        ))}
      </ul>

      {formulario && <CategoriaModal torneo={torneo} categoria={formulario.categoria} onClose={() => setFormulario(null)} />}
      {premios && <PremiosModal torneo={torneo} categoria={premios} onClose={() => setPremios(null)} />}
      <ConfirmDialog open={Boolean(aQuitar)} loading={quitar.isPending} confirmLabel="Quitar"
        title={`¿Quitar la categoría ${aQuitar?.nombre ?? ""}?`} message="Se borran también sus premios."
        onClose={() => setAQuitar(null)} onConfirm={() => quitar.mutate(aQuitar)} />
    </div>
  );
}

function CategoriaModal({ torneo, categoria, onClose }) {
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(esquema), defaultValues: valoresDe(categoria) });
  const guardar = useCambioTorneo(torneo.id,
    (datos) => (categoria ? actualizarCategoria(torneo.id, categoria.id, aCuerpo(datos)) : crearCategoria(torneo.id, aCuerpo(datos))),
    { onExito: onClose });
  const [modo, cupoOpcion, cupoOtro, parejasPorZona, clasifican] = useWatch({ control, name: ["modo", "cupo_opcion", "cupo_otro", "parejas_por_zona", "clasifican_por_zona"] });
  const usarArmado = (ppz, c) => {
    setValue("parejas_por_zona", String(ppz), { shouldValidate: true });
    setValue("clasifican_por_zona", String(c), { shouldValidate: true });
  };

  return (
    <Modal title={categoria ? `Editar ${categoria.nombre}` : "Nueva categoría"} onClose={onClose} busy={guardar.isPending}>
      <form noValidate onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="space-y-4">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1.5 text-sm font-semibold text-(--kt-ink)">Tipo de categoría</legend>
          {[["lista", "De la lista"], ["propio", "Nombre propio"]].map(([valor, etiqueta]) => (
            <label key={valor} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm has-checked:border-(--kt-petrol) has-checked:bg-(--kt-bg-soft)">
              <input type="radio" value={valor} {...register("modo")} /> {etiqueta}
            </label>
          ))}
        </fieldset>
        {modo === "lista" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Nivel" name="nivel" options={OPCIONES_NIVEL} placeholder="Elegí" register={register} error={errors.nivel?.message} />
            <SelectField label="Rama" name="rama" options={OPCIONES_RAMA} placeholder="Elegí" register={register} error={errors.rama?.message} />
          </div>
        ) : (
          <InputField label="Nombre de la categoría" name="nombre_personalizado" placeholder="Ej: Suma 13, +45, Libre" maxLength={60} register={register} error={errors.nombre_personalizado?.message} />
        )}
        <fieldset className="space-y-3 rounded-2xl bg-(--kt-bg-soft) p-3">
          <legend className="px-1 text-sm font-semibold text-(--kt-ink)">Zonas y llave</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Parejas por zona" name="parejas_por_zona" options={OPCIONES_TAMANIO} showPlaceholderOption={false} register={register} error={errors.parejas_por_zona?.message} />
            <SelectField label="Clasifican por zona" name="clasifican_por_zona" options={OPCIONES_CLASIFICAN} showPlaceholderOption={false} register={register} error={errors.clasifican_por_zona?.message} />
          </div>
          <SelectorCupo register={register} errors={errors} opcion={cupoOpcion} parejasPorZona={Number(parejasPorZona)} clasifican={Number(clasifican)} />
          <CalculoLlave cupo={cupoDe({ cupo_opcion: cupoOpcion, cupo_otro: cupoOtro })} parejasPorZona={Number(parejasPorZona)} clasifican={Number(clasifican)} onUsar={usarArmado} />
          <SelectField label="Formato de los partidos de zona" name="formato_zona" options={OPCIONES_FORMATO} showPlaceholderOption={false} register={register} error={errors.formato_zona?.message} />
          <SelectField label="Formato de los partidos de la llave" name="formato_llave" options={OPCIONES_FORMATO} showPlaceholderOption={false} register={register} error={errors.formato_llave?.message} />
        </fieldset>
        {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar la categoría.")} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={guardar.isPending} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={guardar.isPending} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>{guardar.isPending ? "Guardando…" : categoria ? "Guardar cambios" : "Agregar categoría"}</button>
        </div>
      </form>
    </Modal>
  );
}
