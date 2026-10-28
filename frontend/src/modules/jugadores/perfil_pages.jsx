import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
