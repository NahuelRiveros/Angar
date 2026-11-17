/**
 * SIS-38: pide a Cloudinary la imagen al ancho en que se muestra, en el formato más liviano que
 * acepte el navegador. Una URL que no es de Cloudinary vuelve tal cual.
 */
export function imagenCloudinary(url, ancho) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${ancho},c_limit,f_auto,q_auto/`);
}
