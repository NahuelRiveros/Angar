import { setupTablas, crearSuscripcionInicial } from "../../services/sistema/software_suscripcion_service.js";

export async function seed_suscripcion() {
  await setupTablas();
  const r = await crearSuscripcionInicial();
  if (r.ok) console.log(`✅ Suscripción inicial creada — vence ${r.vencimiento}`);
}
