import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ArrowDownUp, Boxes, History, PowerOff, SlidersHorizontal } from "lucide-react";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import FormError from "../../../controls/ui/form_error.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import Etiqueta from "../../../controls/ui/etiqueta.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import { useToast } from "../../../controls/toast/use_toast.js";
import SearchField from "../../../controls/ui/search_field.jsx";
import { mensajeError, mostrarErrores } from "../../../utils/errores.js";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from "../../../controls/ui/estilos.js";
import { Encabezado, Pantalla, SegunConsulta } from "../../../controls/ui/pantalla_panel.jsx";
import { useFiltrosUrl } from "../../../hooks/use_filtros_url.js";
import { useCambiarMinimo, useControlar, useDejarDeControlar, useMovimientos, useMover, useStock } from "../hooks.js";

const FILTROS = [["", "Todo"], ["reponer", "Para reponer"], ["agotado", "Agotado"], ["controlados", "Con control"], ["sin_control", "Sin control"]];
const MARCA = { agotado: ["Agotado", "peligro"], bajo: ["Bajo", "aviso"], ok: ["OK", "exito"] };
const TIPO = { inicio: "Inicio", entrada: "Entrada", salida: "Salida", ajuste: "Ajuste", pedido: "Pedido", devolucion: "Devolución" };
const nombreDe = (fila) => (fila.opcion ? `${fila.producto} (${fila.opcion})` : fila.producto);

/** MST-01 a MST-07. */
export default function StockPage() {
  const toast = useToast();
  const { filtros, cambiar } = useFiltrosUrl(["estado", "q"]);
  const consulta = useStock(filtros);
  const dejar = useDejarDeControlar();
  const [abierto, setAbierto] = useState(null); // { tipo: "mover" | "controlar" | "minimo" | "historial" | "dejar", fila }
  const cerrar = () => setAbierto(null);
  const hayFiltros = Boolean(filtros.q || filtros.estado);

  async function dejarDeControlar() {
    try { toast.success((await dejar.mutateAsync(abierto.fila.variante_id)).mensaje); }
    catch (error) { toast.error(mensajeError(error, "No se pudo cambiar.")); }
    cerrar();
  }

  return (
    <Pantalla>
      <Encabezado titulo="Stock" descripcion="Lo agotado y lo que está en el mínimo aparece primero." />
      <SearchField value={filtros.q ?? ""} onSearch={(q) => cambiar({ q })} label="Buscar en el stock" placeholder="Producto o código" />
      <nav aria-label="Filtros" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {FILTROS.map(([valor, texto]) => (
            <button key={valor} type="button" aria-pressed={(filtros.estado ?? "") === valor} onClick={() => cambiar({ estado: valor })}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${(filtros.estado ?? "") === valor ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{texto}</button>
          ))}
        </div>
      </nav>
      <SegunConsulta consulta={consulta} vacia={consulta.data?.items.length === 0} icono={Boxes}
        tituloVacio={hayFiltros ? "Nada coincide" : "Todavía no hay productos"} descripcionVacio={hayFiltros ? "Probá con otra búsqueda o filtro." : "Cargá productos en el catálogo y después elegí cuáles controlan stock."}>
        {() => (
          <div aria-busy={consulta.isPlaceholderData} className={consulta.isPlaceholderData ? "opacity-60" : ""}>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {consulta.data.items.map((fila) => <Fila key={fila.variante_id} fila={fila} onAbrir={(tipo) => setAbierto({ tipo, fila })} />)}
            </ul>
            {consulta.data.paginacion.totalPages > 1 && <Pagination page={consulta.data.paginacion.page} pages={consulta.data.paginacion.totalPages} total={consulta.data.paginacion.total} onChange={(page) => cambiar({ page: String(page) })} />}
          </div>
        )}
      </SegunConsulta>
      {abierto?.tipo === "mover" && <MoverModal fila={abierto.fila} onClose={cerrar} />}
      {abierto?.tipo === "controlar" && <ControlarModal fila={abierto.fila} onClose={cerrar} />}
      {abierto?.tipo === "minimo" && <MinimoModal fila={abierto.fila} onClose={cerrar} />}
      {abierto?.tipo === "historial" && <HistorialModal fila={abierto.fila} onClose={cerrar} />}
      <ConfirmDialog open={abierto?.tipo === "dejar"} title={`¿Dejar de controlar "${abierto ? nombreDe(abierto.fila) : ""}"?`}
        message="Vuelve a mandar la casilla «Hay stock» del producto. Los movimientos quedan guardados." confirmLabel="Dejar de controlar"
        loading={dejar.isPending} onConfirm={dejarDeControlar} onClose={cerrar} />
    </Pantalla>
  );
}

function Fila({ fila, onAbrir }) {
  const [marca, tono] = MARCA[fila.estado] ?? [];
  const nombre = nombreDe(fila);
  return (
    <li className="grid gap-3 px-3 py-3 sm:flex sm:items-center sm:px-4">
      <div className="flex items-start justify-between gap-3 sm:flex-1 sm:items-center">
        <span className="min-w-0">
          <span className="block font-semibold text-slate-900">{fila.producto}{fila.opcion && <span className="font-normal text-slate-600"> · {fila.opcion}</span>}</span>
          <span className="block text-sm text-slate-600">
            {fila.controla
              ? <>{fila.minimo > 0 ? `Mínimo ${fila.minimo}` : "Sin mínimo"}{fila.codigo && ` · ${fila.codigo}`}</>
              : <>Sin control: {fila.disponible ? "se vende" : "marcado sin stock"}{fila.codigo && ` · ${fila.codigo}`}</>}
          </span>
        </span>
        {fila.controla && (
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-2xl font-extrabold tabular-nums text-slate-900">{fila.cantidad}</span>
            <Etiqueta tono={tono}>{marca}</Etiqueta>
          </span>
        )}
      </div>
      {fila.controla ? (
        <span className="flex gap-2">
          <button type="button" onClick={() => onAbrir("mover")} aria-label={`Mover stock de ${nombre}`} className={`${BOTON_PRIMARIO} flex-1 sm:flex-none`}><ArrowDownUp size={16} aria-hidden="true" /> Mover</button>
          <button type="button" onClick={() => onAbrir("historial")} aria-label={`Movimientos de ${nombre}`} className={BOTON_SECUNDARIO}><History size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => onAbrir("minimo")} aria-label={`Mínimo de ${nombre}`} className={BOTON_SECUNDARIO}><SlidersHorizontal size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => onAbrir("dejar")} aria-label={`Dejar de controlar ${nombre}`} className={BOTON_SECUNDARIO}><PowerOff size={16} aria-hidden="true" /></button>
        </span>
      ) : (
        <button type="button" onClick={() => onAbrir("controlar")} aria-label={`Controlar stock de ${nombre}`} className={BOTON_SECUNDARIO}><Boxes size={16} aria-hidden="true" /> Controlar</button>
      )}
    </li>
  );
}

/** Un formulario chico en un modal: guarda, avisa y cierra; los errores quedan en su campo. */
function useFormModal(accion, valores, onClose) {
  const toast = useToast();
  const form = useForm({ defaultValues: valores });
  const enviar = form.handleSubmit(async (datos) => {
    try { toast.success((await accion.mutateAsync(datos)).mensaje); onClose(); }
    catch (error) { mostrarErrores(error, form.setError, "No se pudo guardar."); }
  });
  return { ...form, enviar };
}

function Botones({ onClose, enviando, texto }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className={BOTON_SECUNDARIO}>Cancelar</button>
      <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>{enviando ? "Guardando…" : texto}</button>
    </div>
  );
}

const AYUDA_TIPO = { entrada: "Llegó mercadería: se suma.", salida: "Rotura, pérdida o venta en el local: se resta.", ajuste: "Contaste: queda exactamente este número." };

/** MST-02 y MST-03. */
function MoverModal({ fila, onClose }) {
  const mover = useMover();
  const { register, control, enviar, formState: { errors } } = useFormModal(mover, { variante_id: fila.variante_id, tipo: "entrada", cantidad: "", motivo: "" }, onClose);
  const tipo = useWatch({ control, name: "tipo" });
  return (
    <Modal open onClose={onClose} busy={mover.isPending} title={`Mover stock · ${nombreDe(fila)}`}>
      <form onSubmit={enviar} noValidate className="space-y-4">
        <p className="text-sm text-slate-600">Hoy hay <strong className="text-slate-900">{fila.cantidad}</strong>.</p>
        <fieldset>
          <legend className="mb-2 font-semibold text-slate-800">Movimiento</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {["entrada", "salida", "ajuste"].map((valor) => (
              <label key={valor} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 font-semibold ${tipo === valor ? "border-(--kt-teal-700) ring-2 ring-(--kt-teal-700)/30" : "border-slate-300"}`}>
                <input type="radio" value={valor} {...register("tipo")} className="h-5 w-5 accent-(--kt-teal-700)" /> {TIPO[valor]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-sm text-slate-600">{AYUDA_TIPO[tipo]}</p>
        </fieldset>
        <InputField label={tipo === "ajuste" ? "Cantidad contada" : "Cantidad"} name="cantidad" type="number" min={0} step="1" inputMode="numeric" register={register} error={errors.cantidad?.message} />
        <InputField label={tipo === "entrada" ? "Motivo (opcional)" : "Motivo"} name="motivo" register={register} error={errors.motivo?.message} autoComplete="off" />
        <FormError message={errors.root?.message} />
        <Botones onClose={onClose} enviando={mover.isPending} texto="Guardar movimiento" />
      </form>
    </Modal>
  );
}

/** MST-01. */
function ControlarModal({ fila, onClose }) {
  const controlar = useControlar();
  const { register, enviar, formState: { errors } } = useFormModal(controlar, { variante_id: fila.variante_id, cantidad: "", minimo: 0 }, onClose);
  return (
    <Modal open onClose={onClose} busy={controlar.isPending} title={`Controlar stock · ${nombreDe(fila)}`}>
      <form onSubmit={enviar} noValidate className="space-y-4">
        <p className="text-sm text-slate-600">Desde ahora, la web muestra «Sin stock» cuando llegue a 0 y los pedidos confirmados descuentan.</p>
        <InputField label="¿Cuántas hay hoy?" name="cantidad" type="number" min={0} step="1" inputMode="numeric" register={register} error={errors.cantidad?.message} />
        <InputField label="Mínimo" name="minimo" type="number" min={0} step="1" inputMode="numeric" register={register} error={errors.minimo?.message} helperText="Con esa cantidad o menos aparece en «Para reponer». 0: sin mínimo." />
        <FormError message={errors.root?.message} />
        <Botones onClose={onClose} enviando={controlar.isPending} texto="Empezar a controlar" />
      </form>
    </Modal>
  );
}

function MinimoModal({ fila, onClose }) {
  const minimo = useCambiarMinimo();
  const { register, enviar, formState: { errors } } = useFormModal(minimo, { variante_id: fila.variante_id, minimo: fila.minimo }, onClose);
  return (
    <Modal open onClose={onClose} busy={minimo.isPending} title={`Mínimo · ${nombreDe(fila)}`}>
      <form onSubmit={enviar} noValidate className="space-y-4">
        <InputField label="Mínimo" name="minimo" type="number" min={0} step="1" inputMode="numeric" register={register} error={errors.minimo?.message} helperText="Con esa cantidad o menos aparece en «Para reponer». 0: sin mínimo." />
        <FormError message={errors.root?.message} />
        <Botones onClose={onClose} enviando={minimo.isPending} texto="Guardar" />
      </form>
    </Modal>
  );
}

/** MST-02: lo que pasó, del más nuevo al más viejo. */
function HistorialModal({ fila, onClose }) {
  const [page, setPage] = useState(1);
  const consulta = useMovimientos(fila.variante_id, page);
  return (
    <Modal open onClose={onClose} title={`Movimientos · ${nombreDe(fila)}`}>
      <SegunConsulta consulta={consulta} vacia={consulta.data?.items.length === 0} icono={History} tituloVacio="Sin movimientos">
        {() => (
          <>
            <ol className="divide-y divide-slate-100">
              {consulta.data.items.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-slate-900">{TIPO[m.tipo]}</span>
                    <span className="text-slate-600"> · {new Date(m.creado_en).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}{m.persona && ` · ${m.persona}`}</span>
                    {m.motivo && <span className="block text-slate-700">{m.motivo}</span>}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className={`block font-bold ${m.cantidad < 0 ? "text-rose-700" : "text-emerald-700"}`}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</span>
                    <span className="block text-xs text-slate-500">quedó {m.saldo}</span>
                  </span>
                </li>
              ))}
            </ol>
            {consulta.data.paginacion.totalPages > 1 && <Pagination page={page} pages={consulta.data.paginacion.totalPages} total={consulta.data.paginacion.total} onChange={setPage} />}
          </>
        )}
      </SegunConsulta>
    </Modal>
  );
}
