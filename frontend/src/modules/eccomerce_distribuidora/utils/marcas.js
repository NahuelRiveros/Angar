const sinAcentos = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "BAGLEY", "Bagley" y "Bag-ley" se consideran la misma marca escrita distinto.
export const claveMarca = (marca) => sinAcentos(marca).replace(/[^a-z0-9]/g, "");
