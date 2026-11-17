import tapia from "./assets/tapia.webp";
import brea from "./assets/brea.webp";
import stupa from "./assets/stupaczuk.webp";
import chingotto from "./assets/chingotto.webp";
import nox from "./assets/nox.png";
import siux from "./assets/siux.png";
import babolat from "./assets/babolat.webp";
import starvie from "./assets/starvie.png";
import adidas from "./assets/adidas.png";
import royalPadel from "./assets/royal-padel.svg";

export const JUGADORES_HOME = [
  { id: "tapia", nombre: "Agustín Tapia", corto: "Tapia", categoria: "El Mozart de Catamarca", origen: "Catamarca, Argentina", imagen: tapia, descripcionImagen: "Agustín Tapia, jugador argentino de pádel", fuente: "https://premierpadel.com/en/rankings/agustin-tapia" },
  { id: "brea", nombre: "Delfina Brea", corto: "Delfi Brea", categoria: "Talento argentino", origen: "Buenos Aires, Argentina", imagen: brea, descripcionImagen: "Delfina Brea, jugadora argentina de pádel", fuente: "https://premierpadel.com/en/rankings/delfina-brea-senesi" },
  { id: "stupa", nombre: "Franco Stupaczuk", corto: "Stupa", categoria: "Potencia chaqueña", origen: "Chaco, Argentina", imagen: stupa, descripcionImagen: "Franco Stupaczuk, jugador argentino de pádel", fuente: "https://premierpadel.com/en/rankings/franco-stupaczuk" },
  { id: "chingotto", nombre: "Federico Chingotto", corto: "Chingotto", categoria: "Corazón de equipo", origen: "Buenos Aires, Argentina", imagen: chingotto, descripcionImagen: "Federico Chingotto, jugador argentino de pádel", fuente: "https://premierpadel.com/en/rankings/federico-chingotto" },
];

export const MARCAS_HOME = [
  { nombre: "NOX", imagen: nox },
  { nombre: "adidas", imagen: adidas, compacta: true, monocromo: true },
  { nombre: "Siux", imagen: siux },
  { nombre: "Babolat", imagen: babolat },
  { nombre: "StarVie", imagen: starvie },
  { nombre: "Royal Padel", imagen: royalPadel, compacta: true, monocromo: true },
];
