// Direcciones públicas de esta instalación. No incluir secretos.
export const deploymentConfig = {
  nombre: "[COMPLETAR nombre del sistema]",
  // [COMPLETAR] las dos URLs (tienen que ser válidas: el build las usa si falta VITE_API_URL).
  backendUrl: "https://completar.onrender.com",
  frontendUrl: "https://completar.vercel.app",
  // Carpeta de este proyecto en Cloudinary (una cuenta puede tener varios proyectos).
  carpetaCloudinary: "completar-carpeta",
  // [COMPLETAR] esquema de la base de producción (BD_ESQUEMA en Render): ahí no se cargan datos de demostración.
  esquemaProduccion: "completar_esquema",
  // Backends de proyectos anteriores: el build falla si VITE_API_URL todavía apunta a uno.
  backendsAnteriores: [],
};
