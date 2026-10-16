import { useEffect, useState } from "react";
import { UserCircle, Check } from "lucide-react";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { getMiPerfil, guardarMiPerfil } from "../api/perfil_cliente_api.js";
import PerfilCampos from "./perfil_campos.jsx";

/**
 * ABM del perfil de facturación/entrega — mismos campos que
 * carrito/perfil_form_modal.jsx (que solo aparece una vez, al enviar el
 * primer pedido), pero acá el cliente puede volver cuando quiera a
 * completarlo o corregirlo (ej. se mudó, cambió de condición de IVA).
 * `guardarMiPerfil` ya es upsert del lado del backend (perfil_cliente_service.js:
 * findOrCreate + update) — el mismo submit sirve para la primera carga y para
 * ediciones posteriores, no hace falta distinguir "crear" de "editar" acá.
 */
export default function PerfilPage() {
  const toast = useToast();
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [celular, setCelular] = useState("");
  const [cuit, setCuit] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [condicionIva, setCondicionIva] = useState("");
  const [direccion, setDireccion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getMiPerfil()
      .then((p) => {
        if (!p) return;
        setNombre(p.nombre ?? "");
        setApellido(p.apellido ?? "");
        setCelular(p.celular ?? "");
        setCuit(p.cuit ?? "");
        setRazonSocial(p.razon_social ?? "");
        setCondicionIva(p.condicion_iva ?? "");
        setDireccion(p.direccion ?? "");
        setProvincia(p.provincia ?? "");
        setDepartamento(p.departamento ?? "");
        setLocalidad(p.localidad ?? "");
        setCodigoPostal(p.codigo_postal ?? "");
      })
      .catch(() => setError("No se pudo cargar tu perfil"))
      .finally(() => setCargando(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !celular.trim() || !cuit.trim() || !direccion.trim() || !provincia || !localidad.trim()) {
      setError("Completá nombre, apellido, celular, CUIT, dirección, provincia y localidad");
      return;
    }
    setError("");
    setGuardando(true);
    try {
      const r = await guardarMiPerfil({
        nombre: nombre.trim(), apellido: apellido.trim(), celular: celular.trim(),
        cuit: cuit.trim(), razon_social: razonSocial.trim() || null, condicion_iva: condicionIva || null,
        direccion: direccion.trim(), provincia, departamento: departamento || null,
        localidad: localidad.trim(), codigo_postal: codigoPostal.trim() || null,
      });
      if (r?.ok === false) { setError(r.mensaje); return; }
      toast.success("Perfil actualizado correctamente");
    } catch (err) {
      setError(err?.response?.data?.mensaje || "No se pudo guardar el perfil");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="kt-body min-h-screen bg-(--kt-bg-soft) p-4 sm:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-(--kt-border) bg-white shadow-sm">
          <AdminSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="kt-body min-h-screen bg-(--kt-bg-soft) p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--kt-turquoise-soft) text-(--kt-teal-700)">
            <UserCircle size={22} />
          </div>
          <div>
            <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">Mi perfil</h1>
            <p className="text-sm text-(--kt-ink-soft)">Tus datos de contacto, facturación y entrega para los pedidos.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-(--kt-border) bg-white p-6 shadow-sm">
          <ErrorBanner message={error} />

          <PerfilCampos
            nombre={nombre} setNombre={setNombre}
            apellido={apellido} setApellido={setApellido}
            celular={celular} setCelular={setCelular}
            cuit={cuit} setCuit={setCuit}
            razonSocial={razonSocial} setRazonSocial={setRazonSocial}
            condicionIva={condicionIva} setCondicionIva={setCondicionIva}
            direccion={direccion} setDireccion={setDireccion}
            provincia={provincia} setProvincia={setProvincia}
            departamento={departamento} setDepartamento={setDepartamento}
            localidad={localidad} setLocalidad={setLocalidad}
            codigoPostal={codigoPostal} setCodigoPostal={setCodigoPostal}
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit" disabled={guardando}
              className="inline-flex items-center gap-1.5 rounded-xl bg-(--kt-teal-700) px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-(--kt-petrol) disabled:opacity-60"
            >
              <Check size={15} /> {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
