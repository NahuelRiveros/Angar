import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useToast } from "../../controls/toast/toast_context.jsx";
import { cambiarRecibirMails } from "../torneos/avisos/avisos_api.js";
import { useAuth } from "../../auth/auth_context.jsx";
import AdminSpinner from "../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../controls/ui/error_banner.jsx";
import { getMiPerfil, getPerfilPublico } from "./jugadores_api.js";
import PerfilJugador from "./perfil_jugador.jsx";
import TarjetaOrganizador from "../suscripcion/tarjeta_organizador.jsx";

const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

function Estado({ consulta, porDefecto, children }) {
  if (consulta.isPending) return <AdminSpinner />;
  if (consulta.isError) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={mensajeDe(consulta.error, porDefecto)} />
        {consulta.error?.response?.status === 404
          ? <Link to="/torneos" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Ver torneos</Link>
          : <button type="button" onClick={() => consulta.refetch()} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Reintentar</button>}
      </div>
    );
  }
  return children;
}

/** /mi-perfil: el propio, con el código para copiar y pasárselo al compañero. */
export function MiPerfilPage() {
  const { usuario } = useAuth();
  const [params] = useSearchParams();
  const perfil = useQuery({ queryKey: ["jugador", "yo", usuario?.usuario_id], queryFn: getMiPerfil });
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
      {/* Al terminar el registro se llega con ?bienvenida=1 (register_page.jsx). */}
      {params.get("bienvenida") && (
        <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ¡Tu cuenta está lista! Abajo está tu código de jugador: con él tu compañero te invita a los torneos. Y si organizás torneos, al final de la página podés empezar gratis.
        </p>
      )}
      <Estado consulta={perfil} porDefecto="No pudimos cargar tu perfil.">
        {perfil.data && <PerfilJugador perfil={perfil.data} propio />}
      </Estado>
      {perfil.data && <PreferenciaMails recibir={perfil.data.recibir_mails !== false} clave={["jugador", "yo", usuario?.usuario_id]} />}
      <TarjetaOrganizador />
    </div>
  );
}

/** /jugadores/:codigo: el perfil público (solo datos deportivos). */
export function PerfilPublicoPage() {
  const { codigo } = useParams();
  const perfil = useQuery({ queryKey: ["jugador", "publico", codigo], queryFn: () => getPerfilPublico(codigo), staleTime: 60_000 });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Estado consulta={perfil} porDefecto="No pudimos cargar el perfil.">
        {perfil.data && <PerfilJugador perfil={perfil.data} />}
      </Estado>
    </div>
  );
}

/** Avisos por mail (confirmaciones, rechazos, horarios). La campanita de la web llega siempre. */
function PreferenciaMails({ recibir, clave }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const cambiar = useMutation({
    mutationFn: cambiarRecibirMails,
    onSuccess: (r) => {
      queryClient.setQueryData(clave, (d) => d && { ...d, recibir_mails: r.recibir_mails });
      toast.success(r.recibir_mails ? "Te vamos a avisar por mail." : "Listo: ya no te mandamos mails. Los avisos siguen en la campanita.");
    },
    onError: () => toast.error("No pudimos guardar la preferencia."),
  });
  return (
    <section aria-labelledby="mails-titulo" className="rounded-3xl border border-(--kt-border) bg-white p-5 shadow-sm">
      <h2 id="mails-titulo" className="flex items-center gap-2 font-bold text-(--kt-ink)"><Mail size={18} aria-hidden="true" className="text-(--kt-teal-700)" /> Avisos por mail</h2>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-sm text-(--kt-ink)">Recibir avisos por mail cuando me confirman, me rechazan algo o me invitan a jugar</span>
        <input type="checkbox" role="switch" checked={recibir} disabled={cambiar.isPending} onChange={(e) => cambiar.mutate(e.target.checked)}
          className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-(--kt-petrol) checked:before:translate-x-5.5 disabled:opacity-50" />
      </label>
      <p className="mt-1 text-xs text-(--kt-ink-soft)">Aunque lo apagues, los avisos siguen apareciendo en la campanita de la web.</p>
    </section>
  );
}
