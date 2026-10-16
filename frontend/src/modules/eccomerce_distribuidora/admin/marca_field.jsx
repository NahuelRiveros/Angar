import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ComboboxField from "../../../controls/ui/combobox_field.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { listarMarcas, crearMarca } from "../api/marcas_distribuidora_api.js";
import { claveMarca } from "../utils/marcas.js";

const MIN_BUSQUEDA = 2;
const CREAR = "__crear__";

/**
 * Marca del artículo elegida de la tabla de marcas: primero las que se ofrecen en
 * la categoría elegida (o en su familia), al escribir también las de otras
 * categorías y, si no existe ninguna con ese nombre, "+ Crear marca" (la da de
 * alta asociada a esta categoría). `onChange(id, nombre)`.
 */
export default function MarcaField({ categoriaId, value, nombre, onChange }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setBusqueda(texto.trim()), 300);
    return () => clearTimeout(timer);
  }, [texto]);

  const propias = useQuery({
    queryKey: ["marcas-familia", Number(categoriaId) || null],
    queryFn: () => listarMarcas({ categoria: categoriaId }),
    enabled: Boolean(categoriaId), staleTime: 60_000,
  });
  const otras = useQuery({
    queryKey: ["marcas-busqueda", busqueda.toLowerCase()],
    queryFn: () => listarMarcas({ q: busqueda }),
    enabled: busqueda.length >= MIN_BUSQUEDA, staleTime: 60_000,
  });

  const opciones = useMemo(() => {
    const deCategoria = propias.data ?? [];
    const ids = new Set(deCategoria.map((m) => m.id));
    return [
      ...deCategoria.map((m) => ({ value: m.id, label: m.nombre, grupo: "De esta categoría" })),
      ...(otras.data ?? []).filter((m) => !ids.has(m.id)).map((m) => ({ value: m.id, label: m.nombre, grupo: "De otras categorías" })),
    ];
  }, [propias.data, otras.data]);

  const buscandoOtras = texto.trim().length >= MIN_BUSQUEDA && (texto.trim() !== busqueda || otras.isFetching);
  const opcionExtra = useCallback((escrito) => {
    // Mientras llega la búsqueda no se ofrece crear: podría existir con otra escritura.
    if (!escrito || buscandoOtras || creando) return null;
    if (opciones.some((o) => claveMarca(o.label) === claveMarca(escrito))) return null;
    return { value: `${CREAR}${escrito}`, label: `+ Crear marca "${escrito}"`, grupo: "Nueva" };
  }, [opciones, buscandoOtras, creando]);

  async function elegir(valor) {
    setError("");
    if (!String(valor).startsWith(CREAR)) {
      onChange(valor === "" ? null : Number(valor), opciones.find((o) => o.value === Number(valor))?.label ?? null);
      return;
    }
    setCreando(true);
    try {
      const r = await crearMarca({ nombre: String(valor).slice(CREAR.length), categorias: [Number(categoriaId)] });
      onChange(r.data.id, r.data.nombre);
      await queryClient.invalidateQueries({ queryKey: ["marcas-familia"] });
    } catch (e) {
      // Ya existía (otra persona la creó recién): se usa esa.
      const existente = e.response?.data?.codigo === "MARCA_EXISTE" ? e.response.data.data : null;
      if (existente) onChange(existente.id, existente.nombre);
      else setError(e.response?.data?.mensaje || "No se pudo crear la marca.");
    } finally { setCreando(false); }
  }

  return (
    <div className="space-y-2">
      <ComboboxField
        label="Marca" options={opciones} value={value ?? ""} onChange={elegir} disabled={!categoriaId || creando}
        onTextoChange={setTexto} opcionExtra={opcionExtra} etiquetaSeleccionada={nombre ?? undefined}
        vacioLabel={categoriaId ? "Sin marca" : "Elegí primero la familia o categoría"}
        placeholder={(propias.data ?? []).length ? "Elegí o escribí para buscar" : "Escribí la marca"}
        helperText={creando ? "Creando la marca…" : categoriaId && propias.isSuccess && propias.data.length === 0 ? "Esta categoría todavía no tiene marcas: escribí para buscar o crear una." : undefined}
      />
      <ErrorBanner message={error} />
    </div>
  );
}
