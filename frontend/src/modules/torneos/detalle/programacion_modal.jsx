import { useForm } from "react-hook-form";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import { mensajeDe } from "./use_cambio_torneo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const VACIO = { fecha: "", hora: "", cancha: "" };

/** Día, hora y cancha del partido. Todo opcional: vacío lo borra. El formato lo valida el servidor. */
export default function ProgramacionModal({ partido, guardar, onClose }) {
  const { register, handleSubmit } = useForm({ defaultValues: { fecha: partido.fecha ?? "", hora: partido.hora ?? "", cancha: partido.cancha ?? "" } });
  const enviar = (datos) => guardar.mutate({ partidoId: partido.id, ...datos });
  const tenia = partido.fecha || partido.hora || partido.cancha;

  return (
    <Modal title="Horario del partido" onClose={onClose} busy={guardar.isPending}>
      <form noValidate onSubmit={handleSubmit(enviar)} className="space-y-4">
        <p className="text-sm text-(--kt-ink)">
          {partido.pareja1?.nombre ?? "A definir"} <span className="text-(--kt-ink-soft)">vs</span> {partido.pareja2?.nombre ?? "A definir"}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Día" name="fecha" type="date" register={register} />
          <InputField label="Hora" name="hora" type="time" register={register} />
        </div>
        <InputField label="Cancha" name="cancha" placeholder="Ej: Cancha 2" maxLength={40} register={register} helperText="Lo ven los jugadores en la página del torneo." />
        {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar el horario.")} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {tenia
            ? <button type="button" disabled={guardar.isPending} onClick={() => enviar(VACIO)} className={`${BOTON} border-red-200 bg-white text-red-800`}>Quitar horario</button>
            : <span />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={onClose} disabled={guardar.isPending} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
            <button type="submit" disabled={guardar.isPending} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>{guardar.isPending ? "Guardando…" : "Guardar horario"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
