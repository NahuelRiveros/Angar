import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../auth/auth_context.jsx";
import { authConfig } from "../../config/auth_config.js";
import { http } from "../../api/http.js";
import { safeReturnTo, authLink } from "../../controls/acceso/return_to.js";
import AuthLayout from "../../controls/acceso/auth_layout.jsx";
import InputField from "../../controls/ui/input_field.jsx";
import FormError from "../../controls/ui/form_error.jsx";
import ActionButton from "../../controls/ui/action_button.jsx";
import BotonGoogle from "../../controls/acceso/boton_google.jsx";
export default function RegisterPage() {
  const [params] = useSearchParams();
  const destination = safeReturnTo(params.get("returnTo"), authConfig.defaultDestination);
  const { login, loginConGoogle, isAuth } = useAuth();
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm();
  if (!authConfig.publicRegistration) return <Navigate to="/login" replace />;
  // Quien vino de otra página (un torneo, por ejemplo) vuelve ahí; si no, conoce su perfil y su código.
  if (isAuth) return <Navigate to={params.get("returnTo") ? destination : "/mi-perfil?bienvenida=1"} replace />;
  return <AuthLayout title={authConfig.texts.registerTitle} subtitle={authConfig.texts.registerSubtitle}>
    <form className="space-y-4" onSubmit={handleSubmit(async ({ nombre, apellido, email, nombre_usuario, password }) => {
      setError("");
      try {
        if (!created) { await http.post(authConfig.endpoints.register, { nombre, apellido, email, nombre_usuario: (nombre_usuario ?? "").trim() || undefined, password }); setCreated(true); }
        await login({ identificador: email, password });
      } catch (e) { setError(e.response?.data?.mensaje || "No se pudo continuar. Si tu cuenta ya fue creada, ingresá con tu email."); }
    })}>
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField name="nombre" label="Nombre" autoComplete="given-name" register={register} required minLength={2} error={errors.nombre?.message} />
        <InputField name="apellido" label="Apellido" autoComplete="family-name" register={register} required minLength={2} error={errors.apellido?.message} />
      </div>
      <InputField name="email" label="Email" type="email" autoComplete="email" register={register} required error={errors.email?.message} />
      <InputField name="nombre_usuario" label="Usuario (opcional)" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        register={register} validationPreset="username" minLength={3} maxLength={30} disabled={created}
        helperText="Podés usarlo para ingresar en lugar del email." error={errors.nombre_usuario?.message} />
      <InputField name="password" label="Contraseña" type="password" autoComplete="new-password" register={register} required
        minLength={authConfig.passwordMinLength} maxLength={authConfig.passwordMaxLength} showPasswordToggle
        helperText={`Usá al menos ${authConfig.passwordMinLength} caracteres.`} error={errors.password?.message} />
      <InputField name="confirmar" label="Confirmar contraseña" type="password" autoComplete="new-password" register={register} required showPasswordToggle
        validate={(v) => v === getValues("password") || "Las contraseñas no coinciden"} error={errors.confirmar?.message} />
      <FormError message={error} />
      <ActionButton type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Continuando…" : created ? "Ingresar con mi cuenta" : "Crear cuenta y continuar"}</ActionButton>
    </form>
    {authConfig.googleClientId && !created && <BotonGoogle clientId={authConfig.googleClientId} onCredencial={loginConGoogle} texto="signup_with" />}
    <Link to={authLink("/login", destination)} className="mt-5 block py-2 text-center text-sm font-semibold text-(--kt-teal-700)">Ya tengo cuenta</Link>
  </AuthLayout>;
}
