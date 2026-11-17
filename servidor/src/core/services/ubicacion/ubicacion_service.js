import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../database/ubicacion");

function cargarJson(nombre) {
  const raw = fs.readFileSync(path.join(DATA_DIR, nombre), "utf-8");
  return JSON.parse(raw);
}

const collator = new Intl.Collator("es");

/**
 * División política de Argentina (IGN/INDEC, vía API GeoRef — datos.gob.ar),
 * cargada una sola vez al arrancar el proceso: 24 provincias, ~530
 * departamentos y ~4000 localidades, fija de por vida (no tiene ABM ni
 * cambia en runtime), por eso vive en memoria y no en una tabla de la DB.
 * Los JSON fuente no traen código postal — el Correo Argentino usa CPA de
 * 8 caracteres sin relación 1 a 1 con localidad, así que ese campo se pide
 * como texto libre en el perfil/pedido (ver perfil_cliente_service.js).
 */
const provincias = cargarJson("provincias.json")
  .provincias.map((p) => ({ id: p.id, nombre: p.nombre }))
  .sort((a, b) => collator.compare(a.nombre, b.nombre));

const departamentos = cargarJson("departamentos.json")
  .departamentos.map((d) => ({ id: d.id, nombre: d.nombre, provincia_id: d.provincia?.id ?? null }))
  .sort((a, b) => collator.compare(a.nombre, b.nombre));

const localidades = cargarJson("localidades.json")
  .localidades.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    provincia_id: l.provincia?.id ?? null,
    departamento_id: l.departamento?.id ?? null,
  }))
  .sort((a, b) => collator.compare(a.nombre, b.nombre));

export function listarProvincias() {
  return provincias;
}

export function listarDepartamentos(provincia_id) {
  if (!provincia_id) return [];
  return departamentos.filter((d) => d.provincia_id === provincia_id);
}

export function listarLocalidades({ provincia_id, departamento_id }) {
  if (!provincia_id) return [];
  return localidades.filter(
    (l) => l.provincia_id === provincia_id && (!departamento_id || l.departamento_id === departamento_id)
  );
}
