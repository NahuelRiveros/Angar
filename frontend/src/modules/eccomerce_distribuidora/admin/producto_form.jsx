import { useEffect, useMemo, useState } from "react";
import InputField from "../../../controls/ui/input_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import ComboboxField from "../../../controls/ui/combobox_field.jsx";
import MarcaField from "./marca_field.jsx";
import PreciosEnListas from "./precios_en_listas.jsx";
import ImageUploadField from "../../../controls/ui/image_upload_field.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { UNIDADES, cantidadConUnidad, describirBulto, textoBultos } from "../../../../../unidades_config.js";
import { formatearPrecio, precioSinIva } from "../utils/precio_iva.js";

const PESTANAS = [
  { id: "general", label: "Datos generales" },
  { id: "precios", label: "Precios" },
  { id: "stock", label: "Stock y unidades" },
];
const OPCIONES_UNIDAD = UNIDADES.map((u) => ({ value: u, label: u }));
const OPCIONES_IVA = [0, 10.5, 21, 27].map((v) => ({ value: String(v), label: `${String(v).replace(".", ",")} %` }));
const fecha = (valor) => (valor ? new Date(valor).toLocaleDateString("es-AR") : null);

/**
 * Ficha del artículo, ordenada como la del sistema de gestión del cliente:
 * datos generales, precios y stock/unidades en pestañas. Cada producto tiene una
 * presentación (variedad) con su precio, código, bulto y stock propios.
 * Se usa en una página propia (ver articulo_form_page.jsx): `onCambio(true)` avisa
 * que hay cambios sin guardar para preguntar antes de salir.
 */
export default function ProductoForm({ onCancelar, onGuardar, onCambio, productoEditar, guardando, opcionesCategoria, categoriaInicial, error = "" }) {
  const v = productoEditar?.variedades?.[0];
  const [pestana, setPestana] = useState("general");
  const [inicial] = useState(() => ({
    categoria_id: productoEditar?.categoria_id ?? categoriaInicial ?? "",
    nombre: productoEditar?.nombre ?? "", marca_id: productoEditar?.marca_id ?? null, marca: productoEditar?.marca ?? "", descripcion: productoEditar?.descripcion ?? "",
    imagen_url: productoEditar?.imagen_url ?? "", activo: productoEditar?.activo ?? true,
    cod_ref: v?.cod_ref ?? "", codigo_barras: v?.codigo_barras ?? "",
    precio: v?.precio ?? "", precio_anterior: v?.precio_anterior ?? "", iva_porcentaje: String(Number(v?.iva_porcentaje ?? 21)),
    controla_stock: v?.controla_stock ?? false, cantidad: v?.cantidad ?? 0, stock_minimo: v?.stock_minimo ?? 0,
    unidad_medida: v?.unidad_medida ?? "UNIDAD", unidad_bulto: v?.unidad_bulto ?? "CAJA", unidades_por_bulto: v?.unidades_por_bulto ?? 1,
  }));
  const [d, setD] = useState(inicial);
  const sucio = useMemo(() => JSON.stringify(d) !== JSON.stringify(inicial), [d, inicial]);
  useEffect(() => { onCambio?.(sucio); }, [sucio, onCambio]);
  const set = (campo) => (e) => setD((prev) => ({ ...prev, [campo]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  const faltaGeneral = !d.categoria_id || !d.nombre.trim();
  const faltaPrecio = d.precio === "" || Number(d.precio) < 0;
  const bulto = describirBulto(d);

  function submit(e) {
    e.preventDefault();
    if (faltaGeneral) { setPestana("general"); return; }
    if (faltaPrecio) { setPestana("precios"); return; }
    onGuardar({
      categoria_id: Number(d.categoria_id), nombre: d.nombre.trim(), marca_id: d.marca_id,
      descripcion: d.descripcion.trim() || null, imagen_url: d.imagen_url.trim() || null, activo: d.activo,
      cod_ref: d.cod_ref.trim() || null, codigo_barras: d.codigo_barras.trim() || null,
      precio: Number(d.precio), precio_anterior: d.precio_anterior === "" ? null : Number(d.precio_anterior),
      iva_porcentaje: Number(d.iva_porcentaje), controla_stock: d.controla_stock,
      cantidad: d.controla_stock ? Number(d.cantidad) || 0 : 0, stock_minimo: Number(d.stock_minimo) || 0,
      unidad_medida: d.unidad_medida, unidad_bulto: d.unidad_bulto, unidades_por_bulto: Number(d.unidades_por_bulto) || 1,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div role="tablist" aria-label="Secciones de la ficha" className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {PESTANAS.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
              className={`min-h-11 flex-1 rounded-lg px-2 py-1 text-center text-sm leading-tight font-semibold ${pestana === p.id ? "bg-white text-(--kt-ink) shadow-sm" : "text-slate-600 hover:text-(--kt-ink)"}`}>
              {p.label}
              {p.id === "general" && faltaGeneral && <span className="ml-1 text-rose-600" aria-label="(faltan datos)">•</span>}
              {p.id === "precios" && faltaPrecio && <span className="ml-1 text-rose-600" aria-label="(faltan datos)">•</span>}
            </button>
          ))}
        </div>

        <ErrorBanner message={error} />

        <div role="tabpanel" hidden={pestana !== "general"} className="space-y-4">
          <ComboboxField label="Familia / categoría" required options={opcionesCategoria} value={d.categoria_id} onChange={set("categoria_id")} placeholder="Escribí para buscar, ej: galletitas" helperText="Elegí la más específica: Familia › Categoría." />
          <InputField label="Descripción del artículo" required hideMessage value={d.nombre} onChange={set("nombre")} placeholder="Ej: 9 de Oro Agridulce 20x200g" />
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Código" hideMessage value={d.cod_ref} onChange={set("cod_ref")} placeholder="Ej: 000519" tooltip="El código del artículo en tu sistema de gestión. Se busca y se imprime en la lista de carga." />
            <InputField label="Código de barras" hideMessage inputMode="numeric" value={d.codigo_barras} onChange={set("codigo_barras")} placeholder="Ej: 7790040001230" />
          </div>
          <div>
            <MarcaField categoriaId={d.categoria_id} value={d.marca_id} nombre={d.marca}
              onChange={(marca_id, marca) => setD((prev) => ({ ...prev, marca_id, marca: marca ?? "" }))} />
          </div>
          <InputField label="Descripción ampliada (opcional)" hideMessage value={d.descripcion} onChange={set("descripcion")} />
          <ImageUploadField label="Imagen (opcional)" tooltip="Arrastrá una foto del producto o pegá una URL." value={d.imagen_url} onChange={set("imagen_url")} />
          {productoEditar && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={d.activo} onChange={set("activo")} />
              Disponible: se muestra en el catálogo de clientes
            </label>
          )}
          {productoEditar?.fecha_alta && <p className="text-xs text-slate-500">Fecha de alta: {fecha(productoEditar.fecha_alta)}</p>}
        </div>

        <div role="tabpanel" hidden={pestana !== "precios"} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Precio de venta" required type="number" step="0.01" min="0" hideMessage value={d.precio} onChange={set("precio")} placeholder="Ej: 1500" tooltip="Es el precio que paga el cliente y se muestra en el catálogo." />
            <SelectField label="IVA" options={OPCIONES_IVA} value={d.iva_porcentaje} onChange={set("iva_porcentaje")} />
          </div>
          {d.precio !== "" && Number(d.precio) > 0 && (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Neto sin IVA: <b>{formatearPrecio(precioSinIva(d.precio, d.iva_porcentaje))}</b>
              {bulto && <> · Precio por bulto ({bulto.toLowerCase()}): <b>{formatearPrecio(Number(d.precio) * Number(d.unidades_por_bulto))}</b></>}
            </p>
          )}
          <InputField label="Precio anterior — oferta (opcional)" type="number" step="0.01" min="0" value={d.precio_anterior} onChange={set("precio_anterior")}
            placeholder="Ej: 2000" helperText="Se muestra tachado como oferta solo si es mayor al precio de venta." />
          {v?.fecha_cambio_precio && <p className="text-xs text-slate-500">Último cambio de precio: {fecha(v.fecha_cambio_precio)}</p>}
          {productoEditar && <PreciosEnListas productoId={productoEditar.id} activa={pestana === "precios"} />}
        </div>

        <div role="tabpanel" hidden={pestana !== "stock"} className="space-y-4">
          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-semibold">Unidades de medida</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Se vende por" options={OPCIONES_UNIDAD} value={d.unidad_medida} onChange={set("unidad_medida")} />
              <SelectField label="Bulto" options={OPCIONES_UNIDAD} value={d.unidad_bulto} onChange={set("unidad_bulto")} />
              <InputField label="Unidades por bulto" type="number" min="1" step="1" hideMessage value={d.unidades_por_bulto} onChange={set("unidades_por_bulto")} tooltip="Equivalencia: cuántas unidades trae cada bulto. 1 = no se arma en bultos." />
            </div>
            <p className="text-sm text-slate-600">{bulto ? `${cantidadConUnidad(1, d.unidad_bulto)} = ${cantidadConUnidad(Number(d.unidades_por_bulto), d.unidad_medida)}` : "Sin bulto: se cuenta y se carga por unidad."}</p>
          </fieldset>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={d.controla_stock} onChange={set("controla_stock")} />
            Controlar stock en la tienda
          </label>
          {d.controla_stock ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label={`Stock (${d.unidad_medida.toLowerCase()})`} type="number" min="0" step="1" value={d.cantidad} onChange={set("cantidad")}
                helperText={bulto ? `= ${textoBultos(d.cantidad, d)}` : "0 = se muestra como agotado."} />
              <InputField label="Stock mínimo" type="number" min="0" step="1" value={d.stock_minimo} onChange={set("stock_minimo")}
                helperText="Con el stock en este número o menos, aparece en «Stock bajo». 0 = sin aviso." />
            </div>
          ) : (
            <p className="text-sm text-slate-600">Sin control de stock: se puede pedir siempre y la disponibilidad se confirma al preparar el pedido.</p>
          )}
        </div>

      </div>
      {/* Fijos abajo: en celular la ficha es larga y Guardar queda siempre a mano. */}
      <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <button type="button" onClick={onCancelar} disabled={guardando} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={guardando} className="min-h-11 rounded-xl bg-(--kt-petrol) px-5 text-sm font-semibold text-white hover:bg-(--kt-night) disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar artículo"}
          </button>
      </div>
    </form>
  );
}
