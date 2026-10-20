import { useEffect } from "react";
import { useForm } from "react-hook-form";
import InputField from "../ui/input_field.jsx";
import SelectField from "../ui/select_field.jsx";
import { useAuth } from "../../auth/auth_context.jsx";
import { projectModules } from "../../config/gate_config.js";

const ROLES_PERSONAL = [
  { value: "staff", label: "Staff" },
  // "vendedor": ve/procesa notas de pedido pero no toca catálogo. Solo lo
  // consume eccomerce_distribuidora hoy (ver nota_pedido_router.js).
  ...(projectModules.eccomerce_distribuidora ? [{ value: "vendedor", label: "Vendedor" }] : []),
];

const ROL_ADMIN = { value: "admin", label: "Admin" };

const valoresIniciales = {
  nombre: "",
  apellido: "",
  email: "",
  documento: "",
  password: "",
  rol_codigo: "staff",
};

export default function StaffFormModal({
  abierto,
  onClose,
  onGuardar,
  staffEditar = null,
  cargando = false,
}) {
  const esEdicion = Boolean(staffEditar);

  const { usuario } = useAuth();
  const esSuperAdmin = Boolean(usuario?.roles?.includes("super_admin"));
  const opcionesRol = esSuperAdmin ? [...ROLES_PERSONAL, ROL_ADMIN] : ROLES_PERSONAL;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
  });

  const rolSeleccionado = watch("rol_codigo");

  useEffect(() => {
    if (!abierto) return;

    if (staffEditar) {
      reset({
        nombre: staffEditar.gym_persona_nombre || "",
        apellido: staffEditar.gym_persona_apellido || "",
        email: staffEditar.gym_persona_email || "",
        documento: staffEditar.gym_persona_documento || "",
        password: "",
        rol_codigo: staffEditar.rol_codigo || "staff",
      });
    } else {
      reset(valoresIniciales);
    }
  }, [abierto, staffEditar, reset]);

  function validar(data) {
    let valido = true;

    if (!data.nombre?.trim()) {
      setError("nombre", { type: "manual", message: "El nombre es obligatorio" });
      valido = false;
    }

    if (!data.apellido?.trim()) {
      setError("apellido", { type: "manual", message: "El apellido es obligatorio" });
      valido = false;
    }

    if (!data.email?.trim()) {
      setError("email", { type: "manual", message: "El email es obligatorio" });
      valido = false;
    }

    if (!data.documento?.trim()) {
      setError("documento", { type: "manual", message: "El documento es obligatorio" });
      valido = false;
    } else if (!/^\d+$/.test(String(data.documento).trim())) {
      setError("documento", {
        type: "manual",
        message: "El documento debe contener solo números",
      });
      valido = false;
    }

    if (!esEdicion) {
      if (!data.password?.trim()) {
        setError("password", {
          type: "manual",
          message: "La contraseña es obligatoria",
        });
        valido = false;
      } else if (String(data.password).trim().length < 4) {
        setError("password", {
          type: "manual",
          message: "La contraseña debe tener al menos 4 caracteres",
        });
        valido = false;
      }
    }

    return valido;
  }

  async function submit(data) {
    if (!validar(data)) return;

    const payload = {
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      email: data.email.trim().toLowerCase(),
      documento: String(data.documento).trim(),
    };

    if (!esEdicion) {
      payload.password = String(data.password).trim();
      payload.rol_codigo = data.rol_codigo || "staff";
    } else if (esSuperAdmin) {
      payload.rol_codigo = data.rol_codigo || "staff";
    }

    await onGuardar(payload);
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="border-b border-blue-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {esEdicion ? "Editar integrante" : "Nuevo integrante"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {esEdicion
              ? "Modificá los datos generales del usuario."
              : "Creá un nuevo usuario de staff."}
          </p>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="Nombre"
              name="nombre"
              register={register}
              error={errors.nombre?.message}
              placeholder="Ej: Juan"
            />

            <InputField
              label="Apellido"
              name="apellido"
              register={register}
              error={errors.apellido?.message}
              placeholder="Ej: Pérez"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="Email"
              name="email"
              register={register}
              error={errors.email?.message}
              placeholder="Ej: juan.staff@empresa.com"
              type="email"
              autoComplete="email"
            />

            <InputField
              label="Documento"
              name="documento"
              register={register}
              error={errors.documento?.message}
              placeholder="Solo números"
              inputMode="numeric"
            />
          </div>

          {!esEdicion && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField
                label="Contraseña"
                name="password"
                register={register}
                error={errors.password?.message}
                placeholder="Mínimo 4 caracteres"
                type="password"
                autoComplete="new-password"
              />

              <SelectField
                label="Rol"
                name="rol_codigo"
                register={register}
                options={opcionesRol}
                fijoValue="staff"
                showPlaceholderOption={false}
              />
            </div>
          )}

          {esEdicion && esSuperAdmin && (
            <SelectField
              label="Rol"
              name="rol_codigo"
              register={register}
              options={opcionesRol}
              fijoValue={staffEditar?.rol_codigo || "staff"}
              showPlaceholderOption={false}
              helperText="Como super administrador podés reasignar el rol de este usuario."
            />
          )}

          {rolSeleccionado === "admin" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Este usuario tendrá acceso administrativo completo al sistema.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={cargando}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}