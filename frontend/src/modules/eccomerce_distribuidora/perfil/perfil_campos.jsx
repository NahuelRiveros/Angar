import { useEffect, useState } from "react";
import InputField from "../../../controls/ui/input_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { getProvincias, getDepartamentos, getLocalidades } from "../../../api/ubicacion_api.js";
import { OPCIONES_CONDICION_IVA } from "./perfil_constantes.js";
import { condicionIva as datosCondicion } from "../../../../../fiscal_config.js";

// Si el valor guardado no aparece en la lista vigente (perfil viejo con un
// nombre que ya no coincide, ej. "CABA" antes de pasar a los datos oficiales
// de GeoRef), lo agregamos igual como opción para no dejar el select vacío.
function conValorActual(opciones, valorActual) {
  if (!valorActual || opciones.some((o) => o.nombre === valorActual)) return opciones;
  return [{ id: "__actual__", nombre: valorActual }, ...opciones];
}

// GeoRef repite nombres entre distintas entidades (ej. una localidad y un
// componente suyo con el mismo nombre) — como el select solo guarda el
// nombre, dos opciones iguales son indistinguibles para el usuario. Sin
// dedupear, además, la key repetida en <option> confunde la reconciliación
// de React dentro de un <select> y deja opciones viejas huérfanas en el DOM.
function unicosPorNombre(lista) {
  const vistos = new Set();
  return lista.filter((o) => (vistos.has(o.nombre) ? false : (vistos.add(o.nombre), true)));
}

/**
 * Campos de facturación/entrega del cliente distribuidor — compartidos entre
 * el modal que se muestra antes del primer pedido (carrito/perfil_form_modal.jsx)
 * y la página "Mi perfil" (perfil/perfil_page.jsx): mismos campos, misma
 * validación visual, dos chromes distintos (modal de un solo uso vs. ABM).
 *
 * Provincia/departamento/localidad son un select en cascada contra la
 * división política oficial (ver servidor/ubicacion_service.js) — cada uno
 * sigue guardando el NOMBRE (no el id) para no romper compatibilidad con lo
 * que ya persiste perfil_cliente_distribuidora/nota_pedido. El código postal
 * es texto libre a propósito: el CPA de Correo Argentino no tiene relación
 * 1 a 1 con localidad, así que no sale de ningún catálogo.
 */
export default function PerfilCampos({
  nombre, setNombre,
  apellido, setApellido,
  celular, setCelular,
  cuit, setCuit,
  razonSocial, setRazonSocial,
  condicionIva, setCondicionIva,
  direccion, setDireccion,
  provincia, setProvincia,
  departamento, setDepartamento,
  localidad, setLocalidad,
  codigoPostal, setCodigoPostal,
}) {
  const aceptaDni = datosCondicion(condicionIva)?.documento === "cuit_o_dni";
  const [provincias, setProvincias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  useEffect(() => {
    getProvincias().then(setProvincias).catch(() => setProvincias([]));
  }, []);

  const provinciaId = provincias.find((p) => p.nombre === provincia)?.id;
  const departamentoId = departamentos.find((d) => d.nombre === departamento)?.id;

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const lista = provinciaId ? await getDepartamentos(provinciaId).catch(() => []) : [];
      if (!cancelado) setDepartamentos(unicosPorNombre(lista));
    })();
    return () => { cancelado = true; };
  }, [provinciaId]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const lista = provinciaId ? await getLocalidades(provinciaId, departamentoId).catch(() => []) : [];
      if (!cancelado) setLocalidades(unicosPorNombre(lista));
    })();
    return () => { cancelado = true; };
  }, [provinciaId, departamentoId]);

  function elegirProvincia(e) {
    setProvincia(e.target.value);
    setDepartamento("");
    setLocalidad("");
  }

  function elegirDepartamento(e) {
    setDepartamento(e.target.value);
    setLocalidad("");
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label="Nombre" required hideMessage autoComplete="given-name"
          value={nombre} onChange={(e) => setNombre(e.target.value)}
        />
        <InputField
          label="Apellido" required hideMessage autoComplete="family-name"
          value={apellido} onChange={(e) => setApellido(e.target.value)}
        />
      </div>

      <InputField
        label="Celular" required hideMessage type="tel" inputMode="tel" autoComplete="tel"
        tooltip="Con código de área, sin 0 ni 15. Lo usamos para coordinar la entrega."
        value={celular} onChange={(e) => setCelular(e.target.value)}
        placeholder="Ej: 11 2345-6789"
      />

      {/* Primero la condición: decide si alcanza con DNI (consumidor final) o hace falta CUIT. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Condición frente al IVA" required
          options={OPCIONES_CONDICION_IVA}
          value={condicionIva}
          onChange={(e) => setCondicionIva(e.target.value)}
          placeholder="Elegí una opción"
        />
        <InputField
          label={aceptaDni ? "CUIT o DNI" : "CUIT"} required hideMessage inputMode="numeric"
          tooltip={aceptaDni ? "Como consumidor final alcanza con tu DNI. Lo usamos para la factura." : "11 números, con o sin guiones. Lo usamos para la factura."}
          value={cuit} onChange={(e) => setCuit(e.target.value)}
          placeholder={aceptaDni ? "Ej: 30123456" : "Ej: 20-12345678-6"}
        />
      </div>

      <InputField
        label="Razón social" hideMessage
        tooltip="El nombre de la empresa tal como figura en ARCA. Dejalo vacío si facturás a tu propio nombre."
        value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)}
        placeholder="(opcional)"
      />

      <InputField
        label="Dirección de entrega" required hideMessage
        tooltip="Calle, número y piso/depto si corresponde."
        value={direccion} onChange={(e) => setDireccion(e.target.value)}
        placeholder="Ej: Av. Siempre Viva 742"
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Provincia" required
          options={conValorActual(provincias, provincia).map((p) => ({ value: p.nombre, label: p.nombre }))}
          value={provincia}
          onChange={elegirProvincia}
        />
        <SelectField
          label="Departamento/Partido"
          options={conValorActual(departamentos, departamento).map((d) => ({ value: d.nombre, label: d.nombre }))}
          value={departamento}
          onChange={elegirDepartamento}
          disabled={!provincia}
          placeholder={provincia ? "Seleccionar..." : "Elegí primero una provincia"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Localidad" required
          options={conValorActual(localidades, localidad).map((l) => ({ value: l.nombre, label: l.nombre }))}
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
          disabled={!provincia}
          placeholder={provincia ? "Seleccionar..." : "Elegí primero una provincia"}
        />
        <InputField
          label="Código postal" hideMessage
          tooltip="El CPA de 4 u 8 caracteres, ej: 2000 o C1425AAB."
          value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)}
          placeholder="(opcional)"
        />
      </div>
    </>
  );
}
