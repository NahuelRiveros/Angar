// Direcciones públicas de esta instalación. No incluir secretos.
export const deploymentConfig = {
  nombre: "MiPadel",
  // [COMPLETAR] con las direcciones reales de Render y Vercel (estas son de EJEMPLO; el build las
  // usa si falta VITE_API_URL).
  backendUrl: "https://mipadel.onrender.com",
  frontendUrl: "https://mipadel.vercel.app",
  // Carpeta de este proyecto en Cloudinary (una cuenta puede tener varios proyectos).
  carpetaCloudinary: "mipadel",
  // Backends de proyectos anteriores: el build falla si VITE_API_URL todavía apunta a uno.
  backendsAnteriores: [],
};
