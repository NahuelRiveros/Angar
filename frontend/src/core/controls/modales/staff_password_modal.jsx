import { useEffect } from "react";
import { useForm } from "react-hook-form";
import InputField from "../ui/input_field.jsx";
import { authConfig } from "../../config/auth_config.js";

const valoresIniciales = {
  password: "",
  confirmarPassword: "",
};

export default function StaffPasswordModal({
  abierto,
  onClose,
  onGuardar,
  staffSeleccionado = null,
  cargando = false,
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
  });

  useEffect(() => {
    if (abierto) {
      reset(valoresIniciales);
    }
  }, [abierto, reset]);

  function validar(data) {
    let valido = true;

    const password = String(data.password ?? "").trim();
    const confirmar = String(data.confirmarPassword ?? "").trim();

    if (!password) {
      setError("password", {
        type: "manual",
        message: "La contraseña es obligatoria",
      });
      valido = false;
    } else if (password.length < authConfig.passwordMinLength) {
      setError("password", {
        type: "manual",
        message: `La contraseña debe tener al menos ${authConfig.passwordMinLength} caracteres`,
      });
      valido = false;
    }

    if (!confirmar) {
      setError("confirmarPassword", {
        type: "manual",
        message: "Debés confirmar la contraseña",
      });
      valido = false;
    } else if (password !== confirmar) {
      setError("confirmarPassword", {
        type: "manual",
        message: "Las contraseñas no coinciden",
      });
      valido = false;
    }

    return valido;
  }

  async function submit(data) {
    if (!validar(data)) return;

    await onGuardar({
      password: String(data.password).trim(),
    });
  }

  if (!abierto) return null;

  const nombreCompleto = staffSeleccionado
    ? `${staffSeleccionado.gym_persona_nombre} ${staffSeleccionado.gym_persona_apellido}`
    : "";

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="border-b border-blue-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Cambiar contraseña</h2>
          <p className="mt-1 text-sm text-gray-600">
            {nombreCompleto
              ? `Actualizá la contraseña de ${nombreCompleto}.`
              : "Actualizá la contraseña del usuario."}
          </p>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4 px-6 py-5">
          <InputField
            label="Nueva contraseña"
            name="password"
            register={register}
            error={errors.password?.message}
            placeholder={`Mínimo ${authConfig.passwordMinLength} caracteres`}
            type="password"
            autoComplete="new-password"
          />

          <InputField
            label="Confirmar contraseña"
            name="confirmarPassword"
            register={register}
            error={errors.confirmarPassword?.message}
            placeholder="Repetí la contraseña"
            type="password"
            autoComplete="new-password"
          />

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
              {cargando ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}