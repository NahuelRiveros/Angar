import { Sexo, TipoDocumento, TipoPersona } from "../../models/index.js";

async function seedCatalogo(Modelo, valores) {
  for (const descripcion of valores) {
    await Modelo.findOrCreate({ where: { descripcion }, defaults: { descripcion } });
  }
}

// Solo lo que usa la distribuidora. Los valores viejos de gym y kinesiología que ya
// estén en la base no se borran: persona los puede referenciar.
export async function seed_catalogos() {
  await seedCatalogo(Sexo, ["Masculino", "Femenino", "Otro"]);
  await seedCatalogo(TipoDocumento, ["DNI", "Pasaporte", "CUIL"]);
  await seedCatalogo(TipoPersona, ["Administrativo"]);
}
