/**
 * PLANTILLA — forma de la entrada de una entidad, con Zod. Ejemplo real: services/sistema/banner_reglas.js.
 * Sin acceso a la base, para poder probarla sola en un test.
 *
 * Cómo usarla: copiá a `services/<dominio>/mi_entidad_esquemas.js`, ajustá los campos y usá cada
 * esquema en el router con `validar({ body, params })`. Los mensajes van en español: los ve el usuario.
 */
import { z } from "zod";

export const esquemaEntidad = z.object({
  nombre: z.string({ error: "Escribí el nombre." }).trim().min(1, "Escribí el nombre.").max(100, "Máximo 100 caracteres."),
  orden: z.coerce.number().int().min(0).default(0),
});

export const esquemaId = z.object({ id: z.coerce.number().int().positive("Id no válido.") });
