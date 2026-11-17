import { useState } from "react";
import { CalendarDays, Image as ImageIcon, Megaphone, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import AdminEmptyState from "../../../controls/ui/admin_empty_state.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { useToast } from "../../../controls/toast/use_toast.js";
import { useBannersAdmin, useGestionBanners, mensajeDeError } from "../../../hooks/use_banners.js";
import { imagenCloudinary } from "../../../utils/imagen_cloudinary.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { cn } from "../../../utils/cn.js";
import BannerFormModal from "./banner_form_modal.jsx";

// SIS-39: el servidor es quien hace cumplir el tope; acá solo se muestra.
const PESTANAS = [
  { tipo: "carrusel", label: "Carrusel", icono: ImageIcon, tope: 8, vacio: "Sin banners en el carrusel: el home muestra el nombre de la tienda como portada." },
  { tipo: "cinta", label: "Cinta", icono: Megaphone, tope: 4, vacio: "Sin textos en la cinta: la franja superior no se muestra." },
];

const ESTADOS = {
  vigente:    { label: "Vigente",    clase: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  programado: { label: "Programado", clase: "bg-sky-50 text-sky-700 border-sky-200" },
  vencido:    { label: "Vencido",    clase: "bg-amber-50 text-amber-800 border-amber-200" },
  inactivo:   { label: "Inactivo",   clase: "bg-slate-100 text-slate-600 border-slate-200" },
};

function textoVigencia({ vigente_desde: desde, vigente_hasta: hasta }) {
  if (desde && hasta) return `Del ${formatearFechaAR(desde)} al ${formatearFechaAR(hasta)}`;
  if (desde) return `Desde el ${formatearFechaAR(desde)}, sin vencimiento`;
  if (hasta) return `Hasta el ${formatearFechaAR(hasta)}`;
  return "Siempre, sin vencimiento";
}

/** "Banners y promociones" (SIS-32, SIS-36): carrusel del home y cinta superior, con fechas. */
export default function BannersPage() {
  const consulta = useBannersAdmin();
  const { guardar, cambiarEstado, eliminar } = useGestionBanners();
  const toast = useToast();
  const [tipo, setTipo] = useState("carrusel");
  const [editando, setEditando] = useState(null); // null = cerrado; {} = nuevo; banner = edición
  const [aBorrar, setABorrar] = useState(null);

  const pestana = PESTANAS.find((p) => p.tipo === tipo);
  const delTipo = (consulta.data ?? []).filter((b) => b.tipo === tipo);
  const activosDe = (t) => (consulta.data ?? []).filter((b) => b.tipo === t && ["vigente", "programado"].includes(b.estado)).length;

  async function alternarEstado(banner) {
    try {
      const r = await cambiarEstado.mutateAsync({ id: banner.id, activo: !banner.activo });
      toast.success(r.mensaje);
    } catch (error) {
      toast.error(mensajeDeError(error, "No se pudo cambiar el estado."));
    }
  }

  async function confirmarBorrado() {
    try {
      await eliminar.mutateAsync(aBorrar.id);
      toast.success("Banner eliminado.");
      setABorrar(null);
    } catch (error) {
      toast.error(mensajeDeError(error, "No se pudo eliminar el banner."));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex flex-col gap-3 rounded-2xl border border-(--kt-turquoise-border) bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Banners y promociones</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Programá el carrusel del inicio y la cinta superior con fecha de inicio y fin: aparecen y se ocultan solos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditando({})}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-(--kt-teal-700) px-4 text-sm font-bold text-white hover:bg-(--kt-teal-900)"
          >
            <Plus size={16} aria-hidden="true" /> {tipo === "carrusel" ? "Nuevo banner" : "Nuevo texto"}
          </button>
        </header>

        <div role="tablist" aria-label="Tipo de banner" className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          {PESTANAS.map(({ tipo: t, label, icono: Icono, tope }) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tipo === t}
              onClick={() => setTipo(t)}
              className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
                tipo === t ? "bg-(--kt-teal-700) text-white" : "text-slate-600 hover:bg-slate-50")}
            >
              <Icono size={16} aria-hidden="true" /> {label}
              {consulta.isSuccess && <span className="text-xs opacity-80">{activosDe(t)}/{tope}</span>}
            </button>
          ))}
        </div>

        {consulta.isPending ? <AdminSpinner />
          : consulta.isError ? (
            <div className="space-y-3">
              <ErrorBanner message={mensajeDeError(consulta.error, "No se pudieron cargar los banners.")} />
              <button type="button" onClick={() => consulta.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <RotateCw size={16} aria-hidden="true" /> Reintentar
              </button>
            </div>
          )
          : delTipo.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
              <AdminEmptyState icon={pestana.icono} title="Todavía no hay nada cargado." description={pestana.vacio} />
            </div>
          )
          : (
            <ul className="space-y-3">
              {delTipo.map((banner) => (
                <FilaBanner
                  key={banner.id}
                  banner={banner}
                  onEditar={() => setEditando(banner)}
                  onEstado={() => alternarEstado(banner)}
                  onBorrar={() => setABorrar(banner)}
                  ocupado={cambiarEstado.isPending}
                />
              ))}
            </ul>
          )}
      </div>

      {editando && <BannerFormModal tipo={editando.tipo ?? tipo} banner={editando.id ? editando : null} guardar={guardar} onClose={() => setEditando(null)} />}

      <ConfirmDialog
        open={Boolean(aBorrar)}
        title="¿Eliminar este banner?"
        message={`"${aBorrar?.titulo ?? ""}" deja de mostrarse y no se puede recuperar. Si solo querés pausarlo, desactivalo.`}
        confirmLabel="Eliminar"
        loading={eliminar.isPending}
        onConfirm={confirmarBorrado}
        onClose={() => setABorrar(null)}
      />
    </div>
  );
}

function FilaBanner({ banner, onEditar, onEstado, onBorrar, ocupado }) {
  const estado = ESTADOS[banner.estado] ?? ESTADOS.inactivo;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
      {banner.tipo === "carrusel" && (
        <img src={imagenCloudinary(banner.imagen_url, 320)} alt="" loading="lazy" className="aspect-3/1 w-full rounded-xl bg-slate-100 object-cover sm:w-48" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", estado.clase)}>{estado.label}</span>
          <span className="text-xs text-slate-400">Orden {banner.orden}</span>
        </div>
        <p className="mt-1 font-semibold text-slate-900">{banner.titulo}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays size={13} aria-hidden="true" /> {textoVigencia(banner)}
        </p>
        {banner.enlace && <p className="mt-0.5 truncate text-xs text-slate-500">Lleva a: {banner.enlace}</p>}
      </div>
      <div className="flex gap-2 sm:flex-col">
        <button type="button" onClick={onEditar} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Pencil size={15} aria-hidden="true" /> Editar
        </button>
        <button type="button" onClick={onEstado} disabled={ocupado} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {banner.activo ? "Desactivar" : "Activar"}
        </button>
        <button type="button" onClick={onBorrar} aria-label={`Eliminar "${banner.titulo}"`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100">
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
