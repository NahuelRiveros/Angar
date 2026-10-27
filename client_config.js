// Políticas compartidas por API y navegador; nunca incluir secretos.
export const clientConfig = {
  id: "mipadel",
  auth: { publicRegistration: true, passwordMinLength: 8, passwordMaxLength: 72, resetMinutes: 20 },
};
