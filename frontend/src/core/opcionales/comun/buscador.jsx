import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { CAMPO } from "./estilos.js";

/** Busca al dejar de escribir, para no consultar por cada letra. */
export default function Buscador({ valor = "", onBuscar, etiqueta, placeholder }) {
  const [texto, setTexto] = useState(valor);
  const [anterior, setAnterior] = useState(valor);
  const espera = useRef(null);
  useEffect(() => () => clearTimeout(espera.current), []);

  // Si la búsqueda se limpia desde afuera ("Ver todos"), también se limpia el campo.
  if (valor !== anterior) {
    setAnterior(valor);
    if (!valor) setTexto("");
  }

  function escribir(nuevo) {
    setTexto(nuevo);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => onBuscar(nuevo.trim()), 350);
  }

  return (
    <label className="relative block w-full">
      <span className="sr-only">{etiqueta}</span>
      <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
      <input type="search" value={texto} onChange={(e) => escribir(e.target.value)} placeholder={placeholder} className={`${CAMPO} pl-10`} />
    </label>
  );
}
