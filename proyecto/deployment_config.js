// Direcciones públicas de esta instalación. No incluir secretos.
export const deploymentConfig = {
  nombre: "MiPadel",
  // Direcciones reales de Render y Vercel (el build usa backendUrl si falta
  // VITE_API_URL).
  backendUrl: "https://kinetica.onrender.com",
  frontendUrl: "https://mipadelcup.vercel.app",
  // Carpeta de este proyecto en Cloudinary (una cuenta puede tener varios proyectos).
  carpetaCloudinary: "mipadel",
  // Backends de proyectos anteriores: el build falla si VITE_API_URL todavía apunta a uno.
  backendsAnteriores: [],
};
