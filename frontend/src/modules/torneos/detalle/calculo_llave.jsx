import { AlertTriangle, Calculator } from "lucide-react";
import InputField from "../../../controls/ui/input_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { LIMITES, ZONAS, planDeLlave, zonasIguales, cuposConZonasIguales, llaveJusta } from "../../../../../torneo_config.js";

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const rondaEnMinuscula = (ronda) => ronda.charAt(0).toLowerCase() + ronda.slice(1);

/** "6 zonas (2 de 4 y 4 de 3)" */
function describirZonas(zonas) {
  const porTamanio = new Map();
  zonas.forEach((t) => porTamanio.set(t, (porTamanio.get(t) ?? 0) + 1));
  const grupos = [...porTamanio].sort(([a], [b]) => b - a);
  const total = plural(zonas.length, "zona", "zonas");
  if (grupos.length === 1) return `${total} de ${grupos[0][0]}`;
  return `${total} (${grupos.map(([t, n]) => `${n} de ${t}`).join(" y ")})`;
}

const PUESTOS_MEJORES = { 2: ["mejor segundo", "mejores segundos"], 3: ["mejor tercero", "mejores terceros"] };
const mejoresDel = (n, puesto) => plural(n, ...(PUESTOS_MEJORES[puesto] ?? [`mejor del puesto ${puesto}`, `mejores del puesto ${puesto}`]));

/** Con qué se completa la llave: "con 2 mejores terceros", "con 1 pase", o nada si es justa. */
function completaCon({ mejores, pases, puestoMejores }) {
  return [mejores && mejoresDel(mejores, puestoMejores), pases && plural(pases, "pase", "pases")].filter(Boolean).join(" y ");
}

function describirLlave(plan) {
  if (!plan.llave) return "Una sola zona y clasifica 1: gana el primero, sin llave.";
  const { tamanio, primeraRonda } = plan.llave;
  const desde = tamanio === 2 ? "se juega solo la final" : `empieza en ${rondaEnMinuscula(primeraRonda)}`;
  const extra = completaCon(plan.llave);
  return `Llave de ${tamanio}: ${desde}${extra ? `, se completa con ${extra}` : ", justa"}.`;
}

/** "llave de 16 justa" o "llave de 16 (+2 mejores terceros)", para las listas. */
function llaveCorta(plan) {
  if (!plan.llave) return "sin llave";
  const extra = completaCon(plan.llave);
  return `llave de ${plan.llave.tamanio}${extra ? ` (+${extra})` : " justa"}`;
}

/** "las de 4 juegan 3 partidos por pareja y las de 3, 2" */
function partidosPorZona(plan) {
  const tamanios = [...new Set(plan.zonas)].sort((a, b) => b - a);
  return tamanios.map((t, i) => (i === 0 ? `en las zonas de ${t} cada pareja juega ${t - 1} partidos` : `en las de ${t}, ${t - 1}`)).join(" y ");
}

function AvisoDesparejas({ plan, consejo }) {
  return (
    <p className="flex gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span><strong>Zonas desparejas:</strong> {partidosPorZona(plan)}. {consejo}</span>
    </p>
  );
}

/** Una línea: lo que sale con esa cantidad de parejas, y aviso si las zonas quedan desparejas. */
export function ResumenLlave({ cantidad, parejasPorZona, clasifican, consejo = "Para que todas jueguen lo mismo, elegí un cupo de la lista al editar la categoría.", className = "" }) {
  const plan = planDeLlave(cantidad, parejasPorZona, clasifican);
  if (!plan) return null;
  return (
    <div className={`space-y-1.5 ${className}`}>
      <p className="text-xs">
        <Calculator size={13} aria-hidden="true" className="mr-1 inline align-[-2px]" />
        Con {cantidad} parejas: {describirZonas(plan.zonas)}, clasifican {plan.clasificados}. {describirLlave(plan)}
      </p>
      {!zonasIguales(plan) && <AvisoDesparejas plan={plan} consejo={consejo} />}
    </div>
  );
}

/**
 * Cupo de la categoría: se elige entre cantidades que dan zonas iguales (con la llave que sale
 * de cada una) o se escribe otro número. Los campos `cupo_opcion` y `cupo_otro` son del formulario.
 */
export function SelectorCupo({ register, errors, opcion, parejasPorZona, clasifican }) {
  const cupos = cuposConZonasIguales(parejasPorZona);
  const opcionDe = (n) => {
    const plan = planDeLlave(n, parejasPorZona, clasifican);
    // "★" marca los cupos que llenan la llave solo con los clasificados directos.
    return { value: String(n), label: `${llaveJusta(plan) ? "★ " : ""}${n} parejas · ${describirZonas(plan.zonas)} · ${llaveCorta(plan)}${zonasIguales(plan) ? "" : " · zonas desparejas"}` };
  };
  // Un cupo elegido antes de cambiar el tamaño de zona sigue a la vista, marcado si quedó desparejo.
  const elegido = /^\d+$/.test(opcion ?? "") && !cupos.includes(Number(opcion)) ? [Number(opcion)] : [];
  const opciones = [
    { value: "", label: "Sin cupo" },
    ...[...cupos, ...elegido].sort((a, b) => a - b).map(opcionDe),
    { value: "otro", label: "Otro número…" },
  ];
  return (
    <>
      <SelectField label="Cupo de parejas" name="cupo_opcion" options={opciones} showPlaceholderOption={false} register={register}
        helperText={`Cupos con todas las zonas de ${parejasPorZona} (todas las parejas juegan lo mismo). ★ = la llave se llena justa con los clasificados.`} />
      {opcion === "otro" && (
        <InputField label="¿Cuántas parejas?" name="cupo_otro" type="number" inputMode="numeric" min={LIMITES.cupoMinimo} max={LIMITES.cupoMaximo}
          register={register} error={errors.cupo_otro?.message} />
      )}
    </>
  );
}

/** Cálculo en vivo dentro del formulario de la categoría, con otros armados para el mismo cupo. */
export function CalculoLlave({ cupo, parejasPorZona, clasifican, onUsar }) {
  const cantidad = Number(cupo);
  const valido = Number.isInteger(cantidad) && cantidad >= 2;
  const plan = valido ? planDeLlave(cantidad, parejasPorZona, clasifican) : null;
  const alternativas = valido
    ? ZONAS.parejasPorZona.flatMap((ppz) => ZONAS.clasificanPorZona.filter((c) => c < ppz).map((c) => ({ ppz, c, plan: planDeLlave(cantidad, ppz, c) })))
    : [];

  return (
    <section aria-labelledby="calculo-titulo" className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
      <h3 id="calculo-titulo" className="flex items-center gap-1.5 font-bold"><Calculator size={16} aria-hidden="true" /> Cálculo de la llave</h3>
      {plan ? (
        <p>
          Con <strong>{cantidad} parejas</strong>: {describirZonas(plan.zonas)}, clasifican <strong>{plan.clasificados}</strong>. <strong>{describirLlave(plan)}</strong>
        </p>
      ) : (
        <p>Elegí un cupo para ver cuántas zonas salen y de qué tamaño queda la llave.</p>
      )}
      {plan && !zonasIguales(plan) && <AvisoDesparejas plan={plan} consejo="Para que todas jueguen lo mismo, elegí un cupo de la lista o probá otro armado." />}
      {plan?.llave?.mejores > 0 && (
        <p className="text-xs">Los lugares que sobran en la llave los ocupan los {PUESTOS_MEJORES[plan.llave.puestoMejores]?.[1] ?? "mejores del puesto siguiente"} de todas las zonas, comparando ganados, diferencia de sets y de games (en promedio por partido), games a favor y, si sigue el empate, sorteo.</p>
      )}
      {plan?.llave?.pases > 0 && <p className="text-xs">Un pase es un lugar libre en la primera ronda: el primero de zona que lo recibe pasa directo a la ronda siguiente.</p>}

      {alternativas.length > 0 && (
        <div>
          <p className="text-xs font-semibold">Con {cantidad} parejas, otros armados:</p>
          <ul className="mt-1.5 space-y-1.5">
            {alternativas.map(({ ppz, c, plan: alt }) => {
              const actual = ppz === parejasPorZona && c === clasifican;
              return (
                <li key={`${ppz}-${c}`} className={`flex items-center justify-between gap-2 rounded-xl py-1 pr-1 pl-3 ${actual ? "bg-white ring-1 ring-sky-300" : "bg-white/60"}`}>
                  <span className="min-w-0 flex-1 text-xs">
                    <strong>Zonas de {ppz}, clasifican {c}</strong> · {describirZonas(alt.zonas)} · {llaveCorta(alt)}
                    {!zonasIguales(alt) && <span className="font-semibold text-amber-800"> · desparejas</span>}
                  </span>
                  {actual
                    ? <span className="shrink-0 px-2 text-xs font-semibold text-sky-700">Elegido</span>
                    : <button type="button" onClick={() => onUsar(ppz, c)} aria-label={`Usar zonas de ${ppz}, clasifican ${c}`}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-sky-300 bg-white px-2.5 text-xs font-semibold text-sky-800 hover:bg-sky-100">Usar</button>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
