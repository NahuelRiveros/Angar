import { Trophy } from "lucide-react";
import { ESTADOS_TORNEO } from "../../../../../torneo_config.js";

const COLORES = {
  borrador: "bg-slate-100 text-slate-700 ring-slate-200",
  inscripcion: "bg-sky-50 text-sky-800 ring-sky-200",
  en_juego: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  finalizado: "bg-violet-50 text-violet-800 ring-violet-200",
  cancelado: "bg-red-50 text-red-800 ring-red-200",
};

export function EstadoTorneo({ estado }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${COLORES[estado] ?? COLORES.borrador}`}>
      {ESTADOS_TORNEO[estado]?.etiqueta ?? estado}
    </span>
  );
}

const DESEMPATES = { entre_ellas: "por el partido entre ellas", games_favor: "por games a favor", sorteo: "por sorteo" };
const PUESTO_MEJOR = { 2: "Mejor 2º", 3: "Mejor 3º" };

/** Al lado del nombre en la tabla: si clasifica (directo o como mejor del puesto siguiente) y qué desempate lo ubicó. */
export function MarcasDeFila({ fila }) {
  const desempate = fila.desempate_mejor ?? fila.desempate;
  return (
    <>
      {fila.clasificado && (
        <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-bold text-emerald-800">
          <Trophy size={12} aria-hidden="true" /> {fila.mejor ? PUESTO_MEJOR[fila.posicion] ?? "Mejor" : "Clasifica"}
        </span>
      )}
      {DESEMPATES[desempate] && <span className="block text-xs text-(--kt-ink-soft)">Definido {DESEMPATES[desempate]}</span>}
    </>
  );
}

/** Aviso arriba de las zonas cuando la llave se completa con los mejores del puesto siguiente. */
export function AvisoMejores({ mejores }) {
  if (!mejores?.cupo) return null;
  const quienes = { 2: "segundos", 3: "terceros" }[mejores.puesto] ?? `del puesto ${mejores.puesto}`;
  return (
    <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      Además clasifican {mejores.cupo === 1 ? `el mejor de los ${quienes}` : `los ${mejores.cupo} mejores ${quienes}`} de todas las zonas
      {mejores.definidos ? "." : ": se definen cuando terminen todas las zonas."}
    </p>
  );
}

// La fecha del partido es de calendario (YYYY-MM-DD): se lee al mediodía argentino para no correr de día.
const diaSemana = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

/** "sáb 05/12 · 18:30 · Cancha 2". Nada si el partido no tiene horario cargado. */
export function HorarioPartido({ partido, className = "" }) {
  const dia = partido.fecha && Object.fromEntries(diaSemana.formatToParts(new Date(`${partido.fecha}T12:00:00-03:00`)).map((p) => [p.type, p.value]));
  const partes = [
    dia && `${dia.weekday.replace(".", "")} ${dia.day}/${dia.month}`,
    partido.hora,
    partido.cancha,
  ].filter(Boolean);
  if (!partes.length) return null;
  return <span className={`block text-xs text-(--kt-ink-soft) ${className}`}>{partes.join(" · ")}</span>;
}
