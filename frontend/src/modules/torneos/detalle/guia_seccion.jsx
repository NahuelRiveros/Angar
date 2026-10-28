import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { EDICION_POR_ESTADO, PERMITIDO } from "../../../../../torneo_config.js";

// Las pestañas siguen el orden en que se arma un torneo: cada guía dice su paso.
const GUIAS = {
  datos: {
    titulo: "Los datos que ven los jugadores",
    puntos: [
      "Nombre, sede, dirección y localidad del torneo.",
      "Fechas de inicio y de fin.",
      "Un contacto (WhatsApp, teléfono o email) y una descripción corta.",
      "Si cobrás la inscripción: el monto por pareja y la cuenta (CBU o alias) donde te transfieren.",
    ],
    consejo: "Para abrir la inscripción hacen falta la sede, la fecha de inicio y al menos una categoría.",
  },
  categorias: {
    titulo: "Las categorías y sus premios",
    puntos: [
      "Agregá categorías de la lista (nivel y rama, como 5ta Mixto) o con nombre propio (Suma 13, Libre…).",
      "Ponele un cupo de parejas si querés limitar los lugares.",
      "Elegí cuántas parejas van por zona, cuántas clasifican y el formato de los partidos de zona y de llave.",
      "Cargá los premios de cada categoría: campeón, subcampeón o los que quieras.",
    ],
    consejo: "Cada categoría juega sus propias zonas y su propia llave.",
  },
  reglamento: {
    titulo: "Las reglas del torneo",
    puntos: [
      "Escribí lo que los jugadores tienen que saber: horarios, tolerancia, pelotas, vestimenta, cómo se desempata…",
      "Lo ve cualquiera que entre a la página pública del torneo.",
    ],
  },
  inscripciones: {
    titulo: "Las parejas anotadas",
    puntos: [
      "Confirmá o rechazá las parejas que se anotaron online. Si rechazás, escribí el motivo: la pareja lo ve.",
      "Cargá a mano las parejas que te escriben por WhatsApp o se anotan en el club: entran confirmadas.",
      "Editá una pareja o dala de baja.",
      "Si un jugador invitó a su compañero por código, la podés confirmar recién cuando el compañero acepta.",
      "Si cobrás la inscripción, mirá el comprobante que manda la pareja: al aprobarlo queda confirmada; si lo rechazás, ve el motivo y manda otro.",
    ],
    consejo: "El cupo cuenta solo las parejas confirmadas, y solo ellas entran en las zonas.",
  },
  zonas: {
    titulo: "Las zonas (fase de grupos)",
    puntos: [
      "Sorteá las zonas de cada categoría. Marcá cabezas de serie para que queden en zonas distintas.",
      "Mové parejas de zona a mano o volvé a sortear, mientras no haya resultados.",
      "Cargá o corregí los resultados: la tabla de posiciones se arma sola.",
    ],
    consejo: "La tabla ordena por partidos ganados, diferencia de sets y de games; si empatan dos, el partido entre ellas; después games a favor y, como último recurso, sorteo (queda escrito en la tabla).",
  },
  llave: {
    titulo: "La llave eliminatoria",
    puntos: [
      "Armá la llave cuando terminen las zonas. Si sobran lugares, los completan los mejores terceros (o segundos) de todas las zonas; nadie cruza a alguien de su zona en la primera ronda.",
      "Cargá los resultados: el ganador avanza solo hasta la final.",
      "Si tenés que corregir las zonas, deshacé la llave (solo si todavía no tiene resultados).",
    ],
    consejo: "No hay partido por el 3º puesto: los semifinalistas comparten el lugar. Cuando termine la final, finalizá el torneo con el botón de arriba.",
  },
};

const PASOS = Object.keys(GUIAS);
const CLAVE_OCULTA = "mipadel:guia-torneo-oculta";

/** Qué se puede hacer en esta pestaña con el torneo como está hoy. */
function ahora(seccion, estado, soloLectura) {
  if (soloLectura) return "Tu plan venció: podés mirar todo, pero no cambiar nada hasta renovarlo.";
  if (estado === "finalizado" || estado === "cancelado") return "El torneo está cerrado: queda solo para consultar.";
  const en = (lista) => lista.includes(estado);
  switch (seccion) {
    case "categorias":
      return EDICION_POR_ESTADO[estado]?.categorias ? "Podés agregar, editar y quitar categorías." : "Con el torneo en juego ya no se agregan ni quitan categorías; los premios sí se editan.";
    case "inscripciones":
      if (estado === "borrador") return "Podés cargar parejas a mano. Para que se anoten solas, abrí la inscripción con el botón de arriba.";
      if (estado === "inscripcion") return "La inscripción está abierta: los jugadores se anotan desde la página pública.";
      return "La inscripción ya cerró: las parejas quedan como están.";
    case "zonas":
      if (!en(PERMITIDO.armarZonas)) return "Todavía no: las zonas se arman cuando abrís la inscripción.";
      return en(PERMITIDO.cargarResultados) ? "Ya podés cargar los resultados de las zonas." : "Ya podés sortear las zonas. Los resultados se cargan cuando pases el torneo a \"En juego\".";
    case "llave":
      return en(PERMITIDO.armarLlave) ? "Ya podés armar la llave de cada categoría que terminó sus zonas." : "Todavía no: la llave se arma con el torneo en juego y las zonas terminadas.";
    default:
      return "Podés editarlo cuando quieras.";
  }
}

function leerOculta() {
  try { return localStorage.getItem(CLAVE_OCULTA) === "1"; } catch { return false; }
}

/** Guía corta arriba de cada pestaña del torneo; se puede ocultar y vuelve a aparecer a pedido. */
export default function GuiaSeccion({ seccion, estado, soloLectura }) {
  const [oculta, setOculta] = useState(leerOculta);
  const guia = GUIAS[seccion];
  if (!guia) return null;

  function cambiar(valor) {
    setOculta(valor);
    try { localStorage.setItem(CLAVE_OCULTA, valor ? "1" : "0"); } catch { /* sin almacenamiento: vale para esta visita */ }
  }

  if (oculta) {
    return (
      <button type="button" onClick={() => cambiar(false)} aria-expanded="false"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline">
        <Lightbulb size={16} aria-hidden="true" /> ¿Qué puedo hacer acá?
      </button>
    );
  }

  return (
    <aside aria-label={`Guía: ${guia.titulo}`} className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-sky-700 uppercase">
          <Lightbulb size={16} aria-hidden="true" className="shrink-0" /> Paso {PASOS.indexOf(seccion) + 1} de {PASOS.length}
        </p>
        <button type="button" onClick={() => cambiar(true)} aria-expanded="true"
          className="-my-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-sky-800 hover:bg-sky-100">
          Ocultar <ChevronDown size={14} aria-hidden="true" className="rotate-180" />
        </button>
      </div>
      <p className="font-bold">{guia.titulo}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {guia.puntos.map((p) => <li key={p}>{p}</li>)}
      </ul>
      {guia.consejo && <p className="mt-2 text-sky-900">{guia.consejo}</p>}
      <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 font-semibold"><span className="text-sky-700">Ahora: </span>{ahora(seccion, estado, soloLectura)}</p>
    </aside>
  );
}
