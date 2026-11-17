import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { http } from "../../api/http.js";
import { authConfig } from "../../config/auth_config.js";
import AuthLayout from "../../controls/acceso/auth_layout.jsx";
import { safeReturnTo, authLink } from "../../controls/acceso/return_to.js";
import InputField from "../../controls/ui/input_field.jsx";
import FormError from "../../controls/ui/form_error.jsx";
import ActionButton from "../../controls/ui/action_button.jsx";
export default function RecoveryPage({ reset = false }) {
  const [params] = useSearchParams();
  const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
  const destination = safeReturnTo(params.get("returnTo"), authConfig.defaultDestination);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm();
  return <AuthLayout title={reset ? "Elegí una nueva contraseña" : "Recuperar mi cuenta"} subtitle={reset ? "El enlace es personal y se puede usar una sola vez." : "Te enviaremos un enlace a tu email para recuperar el acceso."}>
    {message ? <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p> :
      <form className="space-y-4" onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          const r = await http.post(reset ? authConfig.endpoints.reset : authConfig.endpoints.forgot, reset ? { token, newPassword: values.password } : { email: values.email });
          setMessage(r.data.mensaje);
          if (reset) window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch (e) { setError(e.response?.data?.mensaje || "No pudimos completar la solicitud. Intentá nuevamente."); }
      })}>
        {reset ? <>
          <InputField name="password" label="Nueva contraseña" type="password" autoComplete="new-password" register={register} required showPasswordToggle minLength={authConfig.passwordMinLength} maxLength={authConfig.passwordMaxLength} error={errors.password?.message} />
          <InputField name="confirmar" label="Confirmar contraseña" type="password" register={register} required showPasswordToggle validate={(v) => v === getValues("password") || "Las contraseñas no coinciden"} error={errors.confirmar?.message} />
          {!token && <FormError message="El enlace está incompleto. Solicitá uno nuevo." />}
        </> : <InputField name="email" label="Email" type="email" register={register} required error={errors.email?.message} />}
        <FormError message={error} />
        <ActionButton type="submit" disabled={isSubmitting || (reset && !token)} className="w-full">{isSubmitting ? "Procesando…" : reset ? "Guardar contraseña" : "Enviar enlace"}</ActionButton>
      </form>}
    <Link to={authLink("/login", destination)} className="mt-5 block py-2 text-center text-sm font-semibold text-(--kt-teal-700)">Volver a ingresar</Link>
    {reset && <Link to="/forgot-password" className="block py-2 text-center text-sm">Solicitar un nuevo enlace</Link>}
  </AuthLayout>;
}
