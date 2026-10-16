import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { safeReturnTo } from "../../../controls/acceso/return_to.js";
import { getCategorias } from "../api/categoria_distribuidora_api.js";
import { getProducto, crearProducto, actualizarProducto } from "../api/producto_distribuidora_api.js";
import { construirOpcionesCategoria } from "../utils/categoria_jerarquia.js";
import { RUTA_ARTICULOS as ARTICULOS } from "../utils/rutas_articulo.js";
import ProductoForm from "./producto_form.jsx";

/**
 * Ficha del artículo en página propia (alta y edición). `?volver=` indica la
 * pantalla de origen (Artículos con sus filtros, Marcas o Familias); `?familia=`
 * precarga la familia o categoría de un artículo nuevo. Si hay cambios sin guardar, pregunta antes de salir.
 */
export default function ArticuloFormPage() {
  const { id } = useParams();
  const editando = id !== undefined;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const volver = safeReturnTo(params.get("volver"), ARTICULOS);
  const [sucio, setSucio] = useState(false);
  const [error, setError] = useState("");
  const guardado = useRef(false);

  const producto = useQuery({ queryKey: ["gestion-articulo", Number(id)], queryFn: () => getProducto(id), enabled: editando, retry: false });
  const categorias = useQuery({ queryKey: ["gestion-categorias"], queryFn: getCategorias, staleTime: 60_000 });
  const opcionesCategoria = useMemo(() => construirOpcionesCategoria(categorias.data ?? []), [categorias.data]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => sucio && !guardado.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!sucio) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  const guardar = useMutation({
    mutationFn: (payload) => (editando ? actualizarProducto(id, payload) : crearProducto(payload)),
    onSuccess: async () => {
      toast.success(editando ? "Artículo actualizado" : "Artículo creado");
      guardado.current = true;
      await Promise.all(["gestion-articulos", "gestion-articulo", "gestion-marcas", "gestion-marcas-resumen", "marcas-familia", "gestion-categorias", "panel-resumen"]
        .map((clave) => queryClient.invalidateQueries({ queryKey: [clave] })));
      navigate(volver);
    },
    onError: (e) => setError(e.response?.data?.mensaje || "No se pudo guardar el artículo."),
  });
  const onGuardar = (payload) => { setError(""); guardar.mutate(payload); };

  const v = producto.data?.variedades?.[0];
  const titulo = editando ? (producto.data ? `${v?.cod_ref ? `${v.cod_ref} · ` : ""}${producto.data.nombre}` : "Artículo") : "Nuevo artículo";

  let contenido;
  if ((editando && producto.isPending) || categorias.isPending) contenido = <div className="rounded-2xl border border-slate-200 bg-white"><AdminSpinner /></div>;
  else if (producto.isError || categorias.isError) {
    const noExiste = producto.error?.response?.status === 404;
    contenido = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <span className="flex items-center gap-2"><AlertTriangle aria-hidden="true" size={18} />{noExiste ? "Este artículo no existe o fue eliminado." : "No pudimos cargar la ficha."}</span>
        {!noExiste && <button type="button" onClick={() => { producto.refetch(); categorias.refetch(); }} className="min-h-11 rounded-xl bg-white px-4 font-semibold shadow-sm">Reintentar</button>}
      </div>
    );
  } else {
    contenido = (
      <ProductoForm
        key={producto.data?.id ?? "nuevo"} productoEditar={producto.data} opcionesCategoria={opcionesCategoria}
        categoriaInicial={Number(params.get("familia")) || null}
        guardando={guardar.isPending} error={error} onGuardar={onGuardar} onCambio={setSucio} onCancelar={() => navigate(volver)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-6">
      <div>
        <Link to={volver} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-(--kt-teal-700)"><ArrowLeft size={16} /> Volver</Link>
        <h1 className="kt-display text-2xl font-bold break-words text-(--kt-ink)">{titulo}</h1>
      </div>
      {contenido}
      <ConfirmDialog
        open={blocker.state === "blocked"} variant="warning" title="Tenés cambios sin guardar"
        message="Si salís ahora se pierden. ¿Salir igual?" confirmLabel="Salir sin guardar" cancelLabel="Seguir editando"
        onConfirm={() => blocker.proceed?.()} onClose={() => blocker.reset?.()}
      />
    </div>
  );
}
