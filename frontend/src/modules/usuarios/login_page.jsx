import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../auth/auth_context.jsx";
import { authConfig } from "../../config/auth_config.js";
import { safeReturnTo, authLink } from "../../controls/acceso/return_to.js";
import AuthLayout from "../../controls/acceso/auth_layout.jsx";
import InputField from "../../controls/ui/input_field.jsx";
import FormError from "../../controls/ui/form_error.jsx";
import ActionButton from "../../controls/ui/action_button.jsx";
import BotonGoogle from "../../controls/acceso/boton_google.jsx";
export default function LoginPage() {
  const [params] = useSearchParams();
  const destination = safeReturnTo(params.get("returnTo"), authConfig.defaultDestination);
  const { login, loginConGoogle, isAuth, cargando } = useAuth();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  if (isAuth) return <Navigate to={destination} replace />;
  return <AuthLayout title={authConfig.texts.title} subtitle={authConfig.texts.subtitle}>
    <form className="space-y-4" onSubmit={handleSubmit(async (values) => {
      setError("");
      try { await login(values); } catch (e) { setError(e.response?.data?.mensaje || e.message || "No se pudo ingresar"); }
    })}>
      <InputField name="identificador" label={authConfig.loginCampos.identificadorLabel} type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="tu@email.com o tu usuario" register={register} required error={errors.identificador?.message} />
      <InputField name="password" label="Contraseña" type="password" autoComplete="current-password" minLength={1} register={register} required showPasswordToggle error={errors.password?.message} />
      <Link to={authLink("/forgot-password", destination)} className="inline-block py-2 text-sm font-semibold text-(--kt-teal-700)">Olvidé mi contraseña</Link>
      <FormError message={error} />
      <ActionButton type="submit" disabled={isSubmitting || cargando} className="w-full">{isSubmitting ? "Ingresando…" : authConfig.loginCampos.botonLabel}</ActionButton>
    </form>
    {authConfig.googleClientId && <BotonGoogle clientId={authConfig.googleClientId} onCredencial={loginConGoogle} />}
    {authConfig.publicRegistration && <p className="mt-5 text-center text-sm">¿Primera vez? <Link className="font-bold text-(--kt-teal-700)" to={authLink("/register", destination)}>Crear cuenta</Link></p>}
    <Link to={destination} className="mt-4 block py-2 text-center text-sm text-slate-600">Volver</Link>
  </AuthLayout>;
}
