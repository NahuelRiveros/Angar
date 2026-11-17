import { z } from "zod";
import { contrasenaValida, MENSAJE_CONTRASENA } from "../common/contrasena.js";
import { NOMBRE_USUARIO_REGEX, normalizarNombreUsuario } from "../common/nombre_usuario.js";

// Forma de lo que llega a /auth (USU-01, USU-11, USU-13). Las reglas que necesitan la base
// (email repetido, registro habilitado) siguen en auth_service.js.

const texto = (mensaje, max) => z.string({ error: mensaje }).trim().min(1, mensaje).max(max, `Máximo ${max} caracteres.`);
const contrasena = z.string({ error: MENSAJE_CONTRASENA }).refine(contrasenaValida, MENSAJE_CONTRASENA);

export const esquemaLogin = z.object({
  identificador: z.string({ error: "Ingresá tu email o usuario." }).trim().min(1, "Ingresá tu email o usuario.").max(150),
  // Sin reglas de largo: una contraseña mal escrita tiene que dar "incorrectos" (USU-02), no otro mensaje.
  password: z.string({ error: "Ingresá tu contraseña." }).min(1, "Ingresá tu contraseña.").max(200),
});

export const esquemaRegistro = z.object({
  nombre: texto("Ingresá tu nombre.", 100),
  apellido: texto("Ingresá tu apellido.", 100),
  email: z.string({ error: "Ingresá un email válido" }).trim().toLowerCase().max(150).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Ingresá un email válido"),
  password: contrasena,
  // Opcional: vacío = la cuenta entra solo con el email.
  nombre_usuario: z.preprocess(
    (v) => normalizarNombreUsuario(v) || null,
    z.string().regex(NOMBRE_USUARIO_REGEX, "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo").nullable(),
  ),
});

export const esquemaGoogle = z.object({
  credencial: z.string({ error: "No pudimos verificar tu cuenta de Google. Intentá de nuevo." }).min(1).max(5000),
});
