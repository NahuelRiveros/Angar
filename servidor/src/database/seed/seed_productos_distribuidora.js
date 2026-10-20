import { projectModules } from "../../configuracion_servidor/gate_config.js";
import { completarProductos } from "./completar_productos_distribuidora.js";

/**
 * Selección inicial, ampliable por Familia › Categoría; usa las marcas existentes.
 * Solo datos de ProductoDistribuidora: sin precio, códigos, unidades ni bultos,
 * que pertenecen a VariedadDistribuidora. Se crean inactivos y sin presentaciones.
 * fuente_url documenta el origen de la imagen; no se persiste en el artículo.
 * Fuentes consultadas el 20/10/2026. Ver docs/catalogo-inicial-distribuidora.md.
 */
export const PRODUCTOS_INICIALES = {
  "Alimentos Naturales › Avena": [
    {
      "nombre": "Avena Extra Fina 470 Grs Quaker",
      "marca": "Quaker",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/895546/Avena-Extra-Fina-470-Grs-Quaker-1-1053783.jpg?v=639040881871100000",
      "fuente_url": "https://www.disco.com.ar/avena-extra-fina-470-grs-quaker/p"
    },
    {
      "nombre": "Avena Instantanea 500 Grs Quaker",
      "marca": "Quaker",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/895547/Avena-Instantanea-500-Grs-Quaker-1-1053784.jpg?v=639040881874300000",
      "fuente_url": "https://www.disco.com.ar/avena-instantanea-500-grs-quaker/p"
    },
    {
      "nombre": "Avena Tradicional 280 Grs Quaker",
      "marca": "Quaker",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/895548/Avena-Tradicional-280-Grs-Quaker-1-1053785.jpg?v=639040881877900000",
      "fuente_url": "https://www.disco.com.ar/avena-tradicional-280-grs-quaker/p"
    },
    {
      "nombre": "Avena Tradicional 550 Grs Quaker",
      "marca": "Quaker",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/895549/Avena-Tradicional-550-Grs-Quaker-1-1053786.jpg?v=639040881881670000",
      "fuente_url": "https://www.disco.com.ar/avena-tradicional-550-grs-quaker/p"
    }
  ],
  "Alimentos Naturales › Bebidas Vegetales": [
    {
      "nombre": "Bebida A Base De Coco Sin Azúcar 1 Lts Silk",
      "marca": "Silk",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/902907/7791337007932.jpg?v=639105643792100000",
      "fuente_url": "https://www.disco.com.ar/bebida-a-base-de-coco-sin-azucar-1-lts-silk/p"
    },
    {
      "nombre": "Bebida Vegetal de Almendra Sabor Chocolate 1 Lts Silk",
      "marca": "Silk",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/904781/7791337007956.jpg?v=639118516315300000",
      "fuente_url": "https://www.disco.com.ar/bebida-a-base-de-almendras-sabor-chocolate-1-lts-silk/p"
    },
    {
      "nombre": "Bebida Vegetal Sabor Almendras 1 Lts Silk",
      "marca": "Silk",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/902899/7791337007901.jpg?v=639105642318500000",
      "fuente_url": "https://www.disco.com.ar/bebida-a-base-de-almendras-endulzada-1-lts-silk/p"
    },
    {
      "nombre": "Bebida Vegetal Sabor Almendras Sin Azúcar 1 Lts Silk",
      "marca": "Silk",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/902895/7791337007918.jpg?v=639105641434400000",
      "fuente_url": "https://www.disco.com.ar/bebida-a-base-de-almendras-sin-azucar-1-l-silk/p"
    }
  ],
  "Almacén › Aceites": [
    {
      "nombre": "Aceite de Girasol 1.5 Lts Cocinero",
      "marca": "Cocinero",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/614743/Aceite-De-Girasol-Cocinero-1-5-L-1-245602.jpg?v=637409203109900000",
      "fuente_url": "https://www.disco.com.ar/aceite-de-girasol-cocinero-1-5-l/p"
    },
    {
      "nombre": "Aceite de Girasol 900 Ml Cañuelas",
      "marca": "Cañuelas",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/210381/Aceite-CaÑuelas-De-Girasol-X-900-Ml-Aceite-De-Girasol-CaÑuelas-900-Ml-1-46785.jpg?v=636383739908430000",
      "fuente_url": "https://www.disco.com.ar/aceite-de-girasol-canuelas-900-ml/p"
    },
    {
      "nombre": "Aceite De Girasol 900 Ml Cocinero",
      "marca": "Cocinero",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/614663/Aceite-De-Girasol-Cocinero-900-Ml-1-32670.jpg?v=637409202878630000",
      "fuente_url": "https://www.disco.com.ar/aceite-de-girasol-900-ml-cocinero/p"
    }
  ],
  "Almacén › Aceites de Oliva": [
    {
      "nombre": "Aceite de Oliva 250 Ml Cocinero",
      "marca": "Cocinero",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/782785/Aceite-Oliva-Cocinero-Puro-X250cc-1-958448.jpg?v=638203881791000000",
      "fuente_url": "https://www.disco.com.ar/aceite-oliva-cocinero-puro-x250cc/p"
    },
    {
      "nombre": "Aceite de Oliva Extra Virgen 250 Ml Cocinero",
      "marca": "Cocinero",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/782787/Aceite-De-Oliva-Cocinero-Extra-Virgen-X250cc-1-958455.jpg?v=638203881799230000",
      "fuente_url": "https://www.disco.com.ar/aceite-de-oliva-cocinero-extra-virgen-x250cc/p"
    },
    {
      "nombre": "Aceite de Oliva Extra Virgen 250 Ml Colavita",
      "marca": "Colavita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/411613/Aceite-De-Oliva-Colavita-Extra-Virgen-250-Ml-1-237549.jpg?v=636442048961600000",
      "fuente_url": "https://www.disco.com.ar/aceite-de-oliva-colavita-extra-virgen-250-ml/p"
    },
    {
      "nombre": "Aceite de Oliva Extra Virgen 900 Ml Cocinero",
      "marca": "Cocinero",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/902263/Aceite-De-Oliva-Extra-Virgen-X-900-Ml-Cocinero-1-1055978.jpg?v=639094557749170000",
      "fuente_url": "https://www.disco.com.ar/aceite-de-oliva-extra-virgen-x-900-ml-cocinero/p"
    }
  ],
  "Almacén › Arroz": [
    {
      "nombre": "Arroz Carnaroli 500 Grs Dos Hermanos",
      "marca": "Dos Hermanos",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/687689/Arroz-Carnaroli-500-Gr-1-7438.jpg?v=637799421653670000",
      "fuente_url": "https://www.disco.com.ar/arroz-carnaroli-dos-hermanos-500-gr/p"
    },
    {
      "nombre": "Arroz Carnaroli 500 Grs Gallo",
      "marca": "Gallo",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/929109/7790070411792.jpg?v=639252647468070000",
      "fuente_url": "https://www.disco.com.ar/arroz-carnaroli-gallo-x500-gr/p"
    },
    {
      "nombre": "Arroz Integral 1 Kg Dos Hermanos",
      "marca": "Dos Hermanos",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/692227/Arroz-Integral-Dos-Hermanos-Non-Gmo-X1-Kg-1-886330.jpg?v=637819401946230000",
      "fuente_url": "https://www.disco.com.ar/arroz-integral-dos-hermanos-non-gmo-x1-kg/p"
    },
    {
      "nombre": "Arroz Parboil 500 Grs Dos Hermanos",
      "marca": "Dos Hermanos",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/422694/Arroz-Parboil--Dos-Hermanos-X500gr-1-236885.jpg?v=636481031949670000",
      "fuente_url": "https://www.disco.com.ar/arroz-parboil-dos-hermanos-500-gr/p"
    }
  ],
  "Almacén › Azúcar": [
    {
      "nombre": "Azúcar 1 Kg Tradicional Chango",
      "marca": "Chango",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930778/11350102001.jpg?v=639257648827030000",
      "fuente_url": "https://www.disco.com.ar/azucar-chango-1-kg-2/p"
    },
    {
      "nombre": "Azúcar Impalpable 250 Grs Chango",
      "marca": "Chango",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/852577/Az-car-Impalpable-250-Gr-1-1032116.jpg?v=638723794333630000",
      "fuente_url": "https://www.disco.com.ar/azucar-impalpable-chango-bsa-250gr/p"
    },
    {
      "nombre": "Azúcar Molida 1 Kg Ledesma",
      "marca": "Ledesma",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/852599/Az-car-Molida-Ledesma-1-Kg-1-1032141.jpg?v=638723794402700000",
      "fuente_url": "https://www.disco.com.ar/azucar-ledesma-superior-x/p"
    },
    {
      "nombre": "Azucar Organica 1 Kg Chango",
      "marca": "Chango",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/852573/Az-car-Chango-Org-nico-1-Kg-1-1032111.jpg?v=638723794318030000",
      "fuente_url": "https://www.disco.com.ar/azucar-chango-organica-x-1kg/p"
    }
  ],
  "Almacén › Caldos": [
    {
      "nombre": "Caldo De Gallina Balance En Cubos 12 Un Knorr",
      "marca": "Knorr",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/815437/Caldo-Knorr-De-Gallina-Deshidratada-Balance-12-Cubos-1-1008468.jpg?v=638464598365130000",
      "fuente_url": "https://www.disco.com.ar/caldo-de-gallina-balance-en-cubos-12-un-knorr/p"
    },
    {
      "nombre": "Caldo De Gallina En Cubos 114 Grs 12 Un Knorr",
      "marca": "Knorr",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/856898/Caldo-Knorr-De-Gallina-Deshidratado-12-Cubos-1-1008464.jpg?v=638755979926470000",
      "fuente_url": "https://www.disco.com.ar/caldo-de-gallina-en-cubos-114-grs-12-un-knorr/p"
    },
    {
      "nombre": "Caldo De Verdura En Cubos 57 Grs 6 Un Knorr",
      "marca": "Knorr",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/856897/Caldo-de-Verdura-Deshidratado-6-cubos-Knorr-Caldo-Knorr-De-Verdura-Deshidratado-6-Cubos-1-1008463.jpg?v=638755979921900000",
      "fuente_url": "https://www.disco.com.ar/caldo-de-verdura-en-cubos-57-grs-6-un-knorr/p"
    }
  ],
  "Almacén › Condimentos": [
    {
      "nombre": "Comino Molido 25 Grs Alicante",
      "marca": "Alicante",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/681564/Comino-Alicante-St-X25g-1-882575.jpg?v=637752657687030000",
      "fuente_url": "https://www.disco.com.ar/comino-alicante-25-gr-2/p"
    },
    {
      "nombre": "Orégano 25 Grs Alicante",
      "marca": "Alicante",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/682256/Oregano-Alicante-St-X25gr-1-876403.jpg?v=637759677770230000",
      "fuente_url": "https://www.disco.com.ar/oregano-alicante-25-gr-2/p"
    },
    {
      "nombre": "Orégano 50 Grs Alicante",
      "marca": "Alicante",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/682258/Oregano-Alicante-St-X50gr-1-876405.jpg?v=637759677776030000",
      "fuente_url": "https://www.disco.com.ar/oregano-alicante-50-gr-2/p"
    }
  ],
  "Almacén › Conservas de Pescado": [
    {
      "nombre": "Atún Lomo en Aceite Sabor Ahumado 170 Grs La Campagnola",
      "marca": "La Campagnola",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/868186/Atun-Ahumado-X-170-Gr-La-Campagnola-1-1037716.jpg?v=638832873707270000",
      "fuente_url": "https://www.disco.com.ar/atun-ahumado-x-170-gr-la-campagnola/p"
    },
    {
      "nombre": "Lomo de Atún al Natural 170 Grs La Campagnola",
      "marca": "La Campagnola",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/703709/Atun-La-Campagnola-Al-Natural-X170g-1-887998.jpg?v=637895325885100000",
      "fuente_url": "https://www.disco.com.ar/atun-al-natural-170-gr-la-campagnola/p"
    },
    {
      "nombre": "Lomo de Atún en Aceite 170 Grs La Campagnola",
      "marca": "La Campagnola",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/703708/Atun-La-Campagnola-En-Aceite-X170g-1-887997.jpg?v=637895325882100000",
      "fuente_url": "https://www.disco.com.ar/atun-la-campagnola-en-aceite-170gr/p"
    }
  ],
  "Almacén › Fideos": [
    {
      "nombre": "Fideos Coditos 500 Grs Lucchetti",
      "marca": "Lucchetti",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/933013/11460706027.jpg?v=639265516109230000",
      "fuente_url": "https://www.disco.com.ar/fideos-guiseros-lucchetti-coditos-500gr/p"
    },
    {
      "nombre": "Fideos Matarazzo Pennerig X500g",
      "marca": "Matarazzo",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/929083/7790070335999.jpg?v=639252637154930000",
      "fuente_url": "https://www.disco.com.ar/fideos-matarazzo-pennerig-x500g-2/p"
    },
    {
      "nombre": "Fideos Municiones 500 Grs Matarazzo",
      "marca": "Matarazzo",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/929077/7790070320032.jpg?v=639252635891230000",
      "fuente_url": "https://www.disco.com.ar/fideos-municiones-matarazzo-x500-gr-2/p"
    },
    {
      "nombre": "Fideos Tirabuzón 500 Grs Favorita",
      "marca": "Favorita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/592348/Fideos-Tirabuz-n-Favorita-500-Gr-1-27677.jpg?v=637296884076700000",
      "fuente_url": "https://www.disco.com.ar/fideos-tirabuzon-favorita-x500-gr/p"
    }
  ],
  "Almacén › Galletitas": [
    {
      "nombre": "9 de Oro Bizcochos Agridulces 200 g",
      "marca": "9 de Oro",
      "imagen_url": "https://www.pampadrugstore.net/5774-thickbox_default/bizcochos-agridulces-9-de-oro-200-grs.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/galletitas/bizcochos-agridulces-9-de-oro-200-grs.html"
    },
    {
      "nombre": "Galletitas Avena Miel 170gr Cerealitas",
      "marca": "Cerealitas",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/933185/Galletitas-Avena-Miel-170gr-Cerealitas-1-1062879.jpg?v=639269193672570000",
      "fuente_url": "https://www.disco.com.ar/galletitas-avena-miel-170gr-cerealitas-2/p"
    },
    {
      "nombre": "Galletitas Bagley Salvado Paquete 245 G",
      "marca": "Bagley",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/401429/Galletitas-Bagley-Salvado-Paquete-245-G-1-186358.jpg?v=636441864213400000",
      "fuente_url": "https://www.disco.com.ar/galletitas-bagley-salvado-paquete-245-g-211806/p"
    },
    {
      "nombre": "Galletitas Bagley Salvado Paquete 320 G",
      "marca": "Bagley",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/361388/Galletitas-Bagley-Salvado-Paquete-320-G-1-97874.jpg?v=636439862916030000",
      "fuente_url": "https://www.disco.com.ar/galletitas-bagley-salvado-3-56/p"
    },
    {
      "nombre": "Galletitas Granola 243gr Cerealitas",
      "marca": "Cerealitas",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/933186/Galletitas-Granola-243gr-Cerealitas-1-1062880.jpg?v=639269193676870000",
      "fuente_url": "https://www.disco.com.ar/galletitas-granola-243gr-cerealitas-2/p"
    },
    {
      "nombre": "Galletitas Sabor Chocolate 118 Grs Oreo",
      "marca": "Oreo",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/830881/Oreo-Chocolate-118-G-Galletitas-Oreo-Chocolate-118g-1-1022030.jpg?v=638591602310200000",
      "fuente_url": "https://www.disco.com.ar/oreo-chocolate-118-g-2/p"
    },
    {
      "nombre": "Galletitas Sabor Salvado 169 Grs Bagley",
      "marca": "Bagley",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/698192/Galletas-Cereales-Bagley-Salvado-X169g-1-887856.jpg?v=637866922416600000",
      "fuente_url": "https://www.disco.com.ar/galletas-cereales-salvado-bagley-169-gr-2/p"
    },
    {
      "nombre": "Galletitas Terrabusi Express Clasica 324 Gr",
      "marca": "Express",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/569219/Galletitas-Terrabusi-Express-Clasica-324-Gr-1-40889.jpg?v=637152602832370000",
      "fuente_url": "https://www.disco.com.ar/galletitas-terrabusi-express-clasica-324-gr/p"
    },
    {
      "nombre": "Galletitas Terrabusi Express Light 110 Gr",
      "marca": "Express",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/569220/Galletitas-Terrabusi-Express-Light-110-Gr-1-40898.jpg?v=637152602834700000",
      "fuente_url": "https://www.disco.com.ar/galletitas-terrabusi-express-light-110-gr/p"
    },
    {
      "nombre": "Galletitas Terrabusi Express Light 330 Gr",
      "marca": "Express",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/569221/Galletitas-Terrabusi-Express-Light-330-Gr-1-40912.jpg?v=637152602839700000",
      "fuente_url": "https://www.disco.com.ar/galletitas-terrabusi-express-light-330-gr/p"
    }
  ],
  "Almacén › Harinas": [
    {
      "nombre": "Harina 000 1 Kg Favorita",
      "marca": "Favorita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/923604/7790070562258.jpg?v=639219713469930000",
      "fuente_url": "https://www.disco.com.ar/harina-000-vit-x-1-kg-favorita/p"
    },
    {
      "nombre": "Harina 0000 1 Kg Morixe",
      "marca": "Morixe",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/504009/Harina-Morixe-0000-1kg-Tipo-0000-Sin-Atributo-Sin-Atributo-1-118167.jpg?v=636815766619200000",
      "fuente_url": "https://www.disco.com.ar/harina-0000-morixe-1-kg/p"
    },
    {
      "nombre": "Harina Integral 100pureza 1 Kg",
      "marca": "Pureza",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/535062/Harina-Pureza-Integral-100--1-669139.jpg?v=636943074783970000",
      "fuente_url": "https://www.disco.com.ar/harina-integral-100pureza-1-kg/p"
    },
    {
      "nombre": "Harina Leudante Morixe 1 Kg",
      "marca": "Morixe",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/504010/Harina-Morixe-Leudante-Sin-Atributo-Sin-Atributo-Sin-Atributo-Sin-Atributo-1-118323.jpg?v=636815766623100000",
      "fuente_url": "https://www.disco.com.ar/harina-leudante-morixe-1-kg/p"
    }
  ],
  "Almacén › Ketchup": [
    {
      "nombre": "Ketchup 190 Grs Heinz",
      "marca": "Heinz",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/555017/Ketchup-Heinz-Doy-pack-190gr-1-697761.jpg?v=637092979123530000",
      "fuente_url": "https://www.disco.com.ar/ketchup-heinz-doy-pack-190gr/p"
    },
    {
      "nombre": "Ketchup 250 Grs Hellmann's",
      "marca": "Hellmann's",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/878036/11520105027.jpg?v=638890599357700000",
      "fuente_url": "https://www.disco.com.ar/ketchup-hellmann-s-regular-doypack-250-gr/p"
    },
    {
      "nombre": "Ketchup 397 Grs Heinz",
      "marca": "Heinz",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/554953/Aderezo-Ketchup-Heinz-Rocket-Up-Side-Down-397-Gr-1-17491.jpg?v=637092978872630000",
      "fuente_url": "https://www.disco.com.ar/ketchup-heinz-x-397-gr/p"
    },
    {
      "nombre": "Ketchup 500 Grs Hellmann's",
      "marca": "Hellmann's",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/856849/Ketchup-Hellmann-s-Regular-Doypack-500-Gr-1-892111.jpg?v=638755979771700000",
      "fuente_url": "https://www.disco.com.ar/ketchup-hellmann-s-regular-doypack-500-gr/p"
    }
  ],
  "Almacén › Mayonesas": [
    {
      "nombre": "Aderezo Mayonesa Natura 950 Gr",
      "marca": "Natura",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/685487/Aderezo-Mayonesa-Natura-950-Gr-1-41500.jpg?v=637786569836630000",
      "fuente_url": "https://www.disco.com.ar/aderezo-mayonesa-natura-950-gr/p"
    },
    {
      "nombre": "Mayonesa 200 Grs Heinz",
      "marca": "Heinz",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/891483/Mayonesa-Heinz-200-Gr-1-260532.jpg?v=638997897910030000",
      "fuente_url": "https://www.disco.com.ar/mayonesa-heinz-200-gr/p"
    },
    {
      "nombre": "Mayonesa Hellmanns Pesto 340gr",
      "marca": "Hellmann's",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/926438/11510201014.jpg?v=639238671017000000",
      "fuente_url": "https://www.disco.com.ar/mayonesa-hellmanns-pesto-340gr/p"
    },
    {
      "nombre": "Mayonesa Liviana 475 Grs Hellmann's",
      "marca": "Hellmann's",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/856854/Mayonesa-Liviana-Doypack-475-Gr-Hellmann-s-Mayonesa-Hellmann-s-Liviana-Doypack-475-Gr-1-943077.jpg?v=638755979789830000",
      "fuente_url": "https://www.disco.com.ar/mayonesa-hellmann-s-liviana-doypack-475-gr/p"
    }
  ],
  "Almacén › Mermeladas": [
    {
      "nombre": "Mermelada La Campagnola Arandano 390gr",
      "marca": "La Campagnola",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/927970/11280703047.jpg?v=639245832635500000",
      "fuente_url": "https://www.disco.com.ar/mermelada-la-campagnola-arandano-390gr/p"
    },
    {
      "nombre": "Mermelada Sabor Ciruela 454 Grs Arcor",
      "marca": "Arcor",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/667312/Mermelada-Arcor-Ciruela-Fruta-X454g-1-876679.jpg?v=637677706580100000",
      "fuente_url": "https://www.disco.com.ar/mermelada-arcor-ciruela-454gr/p"
    },
    {
      "nombre": "Mermelada Sabor Damasco 454 Grs Arcor",
      "marca": "Arcor",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/681885/Mermelada-Arcor-Damasco-Fruta-X454g-1-876676.jpg?v=637757193794030000",
      "fuente_url": "https://www.disco.com.ar/mermelada-damasco-fruta-arcor-454-gr/p"
    },
    {
      "nombre": "Mermelada Sabor Durazno 454 Grs La Campagnola",
      "marca": "La Campagnola",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/669813/Mermelada-La-Campagnola-Durazno-F-X454g-1-879376.jpg?v=637691638155630000",
      "fuente_url": "https://www.disco.com.ar/mermelada-la-campagnola-durazno-454gr/p"
    }
  ],
  "Almacén › Mostazas": [
    {
      "nombre": "Aderezo Mostaza 220 Grs Dánica",
      "marca": "Dánica",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/785349/Mostaza-Danica-X220g-1-971837.jpg?v=638223765647570000",
      "fuente_url": "https://www.disco.com.ar/mostaza-x-220-gr-danica/p"
    },
    {
      "nombre": "Mostaza 200 Grs Heinz",
      "marca": "Heinz",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/894113/Mostaza-Doy-Pack-X-200-Grs-Heinz-1-1052689.jpg?v=639020145750830000",
      "fuente_url": "https://www.disco.com.ar/mostaza-doy-pack-x-200-grs-heinz/p"
    },
    {
      "nombre": "Mostaza 250 Grs Natura",
      "marca": "Natura",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/453534/Aderezo-Mostaza-Natural-250-Gr-1-27457.jpg?v=636591018326700000",
      "fuente_url": "https://www.disco.com.ar/mostaza-natura-250-gr/p"
    },
    {
      "nombre": "Mostaza 350 Grs Heinz",
      "marca": "Heinz",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/894112/Mostaza-Doy-Pack-X-350-Grs-Heinz-1-1052688.jpg?v=639020145746000000",
      "fuente_url": "https://www.disco.com.ar/mostaza-doy-pack-x-350-grs-heinz/p"
    }
  ],
  "Almacén › Pasta de Maní": [
    {
      "nombre": "Pasta De Maní 485 Gr Mani King",
      "marca": "Maní King",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/866738/Pasta-De-Man-485-Gr-Mani-King-1-851505.jpg?v=638824017893630000",
      "fuente_url": "https://www.disco.com.ar/pasta-de-mani-485-gr-mani-king-2/p"
    }
  ],
  "Almacén › Sal": [
    {
      "nombre": "Sal Entrefina Celusal 500 Gr",
      "marca": "Celusal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/547905/Sal-Celusal-Entrefina-X500gr-1-802434.jpg?v=637040275326630000",
      "fuente_url": "https://www.disco.com.ar/sal-entrefina-celusal-500-gr/p"
    },
    {
      "nombre": "Sal Gruesa 1 Kg Celusal",
      "marca": "Celusal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/538489/Sal-Gruesa-Celusal-1-Kg-1-41269.jpg?v=636983688437800000",
      "fuente_url": "https://www.disco.com.ar/sal-gruesa-celusal-1-kg-3/p"
    },
    {
      "nombre": "Sal Light 235 Grs Celusal",
      "marca": "Celusal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/204790/Sal-Celusal-Light-Sal-Celusal-Light-235-Gr-1-41185.jpg?v=636383672797700000",
      "fuente_url": "https://www.disco.com.ar/sal-light-celusal-235-gr/p"
    }
  ],
  "Almacén › Salsas de Tomate": [
    {
      "nombre": "Puré de Tomate Clásico 530 Grs La Campagnola",
      "marca": "La Campagnola",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/822985/Pure-De-Tomate-La-Campagnola-530g-1-1010729.jpg?v=638508247699970000",
      "fuente_url": "https://www.disco.com.ar/pure-de-tomate-la-campagnola-530-gr/p"
    },
    {
      "nombre": "Puré de Tomate Listas 520 Grs Salsati",
      "marca": "Salsati",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/178522/Pure-De-Tomate-Salsati-X-520-Gr-Pure-De-Tomate-Salsati-520-Gr-1-6457.jpg?v=636383365783870000",
      "fuente_url": "https://www.disco.com.ar/pure-de-tomate-salsati-520-gr/p"
    }
  ],
  "Bazar › Sartenes": [
    {
      "nombre": "Sartén Tramontina Starflon Antiadherente Negra 24 cm",
      "marca": "Tramontina",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/293119/Sarten-Con-Antiadherente-Tramontina-Numero-24--U-1-176962.jpg?v=636389872642900000",
      "fuente_url": "https://www.disco.com.ar/sarten-tramontina-24-cm-negro-antiadherente-starflon-con-espatula-de-regalo/p"
    },
    {
      "nombre": "Sartén Tramontina Starflon Antiadherente Negra 28 cm",
      "marca": "Tramontina",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/297824/SartEn-Tramontina-X-1-Un-Con-Antiadherente-28-Cm-Bli-1-Un-1-186684.jpg?v=636390418138930000",
      "fuente_url": "https://www.disco.com.ar/sarten-tramontina-28-cm-negro-antiadherente-starflon-con-espatula-de-regalo/p"
    },
    {
      "nombre": "Sartén Tramontina Formia  24 Cm",
      "marca": "Tramontina",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/709784/Formia-Sart-n-24-Cm-Tramontina-1-890227.jpg?v=637927402513970000",
      "fuente_url": "https://www.disco.com.ar/sarten-tramontina-formia-24-cm/p"
    }
  ],
  "Bebés › Pañales": [
    {
      "nombre": "Pañales Classic G X 36 Un Huggies",
      "marca": "Huggies",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/889419/Pa-ales-Classic-G-X-36-Un-Huggies-1-1042648.jpg?v=638977377718970000",
      "fuente_url": "https://www.disco.com.ar/panales-classic-g-x-36-un-huggies/p"
    },
    {
      "nombre": "Pañales Flexi Comfort Disney G X 60 Un Huggies",
      "marca": "Huggies",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/842960/Pa-ales-Huggies-Flexi-Comfort-Disney-G-X60-1-945583.jpg?v=638654782821300000",
      "fuente_url": "https://www.disco.com.ar/panales-flexi-comfort-disney-g-x-60-un-huggies/p"
    },
    {
      "nombre": "Pañales Natural Care G X 40 Un Huggies",
      "marca": "Huggies",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/842965/Pa-ales-Huggies-Supreme-Care-G-40u-1-972526.jpg?v=638654782843000000",
      "fuente_url": "https://www.disco.com.ar/panales-natural-care-g-x-40-un-huggies/p"
    }
  ],
  "Bebés › Toallitas Húmedas": [
    {
      "nombre": "Toallitas Húmedas Cuidado Relajante 50 Un Estrella",
      "marca": "Estrella",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/772015/Toallitas-Humedas-Estrella-Cuidado-Relajante-5-1-946575.jpg?v=638134546051900000",
      "fuente_url": "https://www.disco.com.ar/toallitas-humedas-cuidado-relajante-5o-un-estrella/p"
    },
    {
      "nombre": "Toallitas Húmedas Higiene Completa x 48 Un Pampers",
      "marca": "Pampers",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/640802/Toallitas-Humedas-Pampers-Completa-12-1-869494.jpg?v=637556947780770000",
      "fuente_url": "https://www.disco.com.ar/toallitas-humedas-pampers-higiene-completa-x-48-u/p"
    }
  ],
  "Bebidas › Aguas": [
    {
      "nombre": "Agua Mineral con Gas 1,5 Lts Eco de los Andes",
      "marca": "Eco de los Andes",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/816031/Agua-Eco-De-Los-Andes-Con-Gas-Botella-1-5ltx1-1-239793.jpg?v=638467190623500000",
      "fuente_url": "https://www.disco.com.ar/agua-eco-de-los-andes-con-gas-botella-1-5ltx1/p"
    },
    {
      "nombre": "Agua Mineral Sin Gas 2 Lts Eco de los Andes",
      "marca": "Eco de los Andes",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/816033/Agua-Mineral-Eco-De-Los-Andes-Sin-Gas-2-L-1-239957.jpg?v=638467190629970000",
      "fuente_url": "https://www.disco.com.ar/agua-mineral-eco-de-los-andes-sin-gas-2-l/p"
    },
    {
      "nombre": "Agua Mineral Sin Gas 2 Lts Glaciar",
      "marca": "Glaciar",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/893693/Agua-Glaciar-Sin-Gas-Botella-2ltx1-1-237513.jpg?v=639014961694870000",
      "fuente_url": "https://www.disco.com.ar/agua-glaciar-sin-gas-botella-2ltx1/p"
    },
    {
      "nombre": "Agua Mineral Sin Gas 2250 Ml Villa del Sur",
      "marca": "Villa del Sur",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/933180/12120104025.jpg?v=639269150022970000",
      "fuente_url": "https://www.disco.com.ar/agua-villa-del-sur-pet-sin-gas-2250-ml/p"
    }
  ],
  "Bebidas › Aguas Saborizadas": [
    {
      "nombre": "Agua Saborizada Sabor Manzana 2.25 Lts Aquarius",
      "marca": "Aquarius",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/893231/Saborizada-Aquarius-Manzana-2-25lt-1-468840.jpg?v=639009777830100000",
      "fuente_url": "https://www.disco.com.ar/saborizada-aquarius-manzana-2-25lt/p"
    },
    {
      "nombre": "Agua Saborizada Sabor Pera 2.2 Lts Aquarius",
      "marca": "Aquarius",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/783097/Agua-Saborizada-Aquarius-Pera-2-25-Lt-1-468830.jpg?v=638206693728130000",
      "fuente_url": "https://www.disco.com.ar/saborizada-aquarius-pera-2-2lt/p"
    },
    {
      "nombre": "Agua Saborizada Sabor Pera 2.25 Lts Levite",
      "marca": "Levité",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/833856/Saborizada-Levite-Pera-2-25lt-1-468926.jpg?v=638615902299930000",
      "fuente_url": "https://www.disco.com.ar/saborizada-levite-pera-2-25lt/p"
    },
    {
      "nombre": "Agua Saborizada Sabor Pomelo 2.25 Lts Aquarius",
      "marca": "Aquarius",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/783095/Agua-Saborizada-Aquarius-Pomelo-2-25-Lt-1-468820.jpg?v=638206693718970000",
      "fuente_url": "https://www.disco.com.ar/saborizada-aquarius-pomelo-2-25lt/p"
    }
  ],
  "Bebidas › Cervezas": [
    {
      "nombre": "Cerveza Rubia 330 Cc Corona",
      "marca": "Corona",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/890503/Cerveza-Rubia-330ml-Corona-1-23252.jpg?v=639140661868430000",
      "fuente_url": "https://www.disco.com.ar/cerveza-rubia-330ml-corona-2/p"
    },
    {
      "nombre": "Cerveza Rubia 710 Cc x 4 Un Stella Artois",
      "marca": "Stella Artois",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/890552/Cerveza-Rubia-710ml-X-4u-Stella-Artois-1-997468.jpg?v=638987206260800000",
      "fuente_url": "https://www.disco.com.ar/cerveza-rubia-710ml-x-4u-stella-artois/p"
    },
    {
      "nombre": "Cerveza Rubia 975 Ml Stella Artois",
      "marca": "Stella Artois",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/890543/Cerveza-Botella-Retornable-975-Ml-Stella-Artois-1-877845.jpg?v=638987206215970000",
      "fuente_url": "https://www.disco.com.ar/cerveza-botella-retornable-975-ml-stella-artois/p"
    },
    {
      "nombre": "Cerveza Rubia x 6 Un 473 Cc Stella Artois",
      "marca": "Stella Artois",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/890519/Cerveza-Rubia-X-6-Un-Stella-Artois-1-305956.jpg?v=638987206120670000",
      "fuente_url": "https://www.disco.com.ar/cerveza-rubia-x-6-un-stella-artois/p"
    },
    {
      "nombre": "Quilmes Cerveza 330 ml",
      "marca": "Quilmes",
      "imagen_url": "https://www.pampadrugstore.net/1162-thickbox_default/cerveza-quilmes-355-ml.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/bebidas-con-alcohol/cerveza-quilmes-355-ml.html"
    }
  ],
  "Bebidas › Gaseosas": [
    {
      "nombre": "Gaseosa Sabor Lima y Limón 2.25 Lts Sprite",
      "marca": "Sprite",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/791803/Gaseosa-Sprite-Lima-Lim-n-2-25lts-Gaseosa-Sprite-Lima-lim-n-2-25-Lt-1-248213.jpg?v=638291793679300000",
      "fuente_url": "https://www.disco.com.ar/gaseosa-sprite-lima-limon-2-25-lt/p"
    },
    {
      "nombre": "Gaseosa Sabor Naranja 1.75 Lts Fanta",
      "marca": "Fanta",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/783119/Gaseosa-Fanta-Naranja-1-75-Lt-1-766720.jpg?v=638206698013630000",
      "fuente_url": "https://www.disco.com.ar/gaseosa-fanta-naranja-1-75lt/p"
    },
    {
      "nombre": "Gaseosa Sabor Naranja 2,25 Lts Fanta",
      "marca": "Fanta",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/893230/Gaseosa-Naranja-2-25-Lts-Fanta-1-248227.jpg?v=639009777826030000",
      "fuente_url": "https://www.disco.com.ar/gaseosa-naranja-2-25-lts-fanta/p"
    },
    {
      "nombre": "Gaseosa Tónica 1.5 Lts Schweppes",
      "marca": "Schweppes",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930478/12111302006.jpg?v=639256195188300000",
      "fuente_url": "https://www.disco.com.ar/gaseosa-schweppes-tonica-1-5-l/p"
    }
  ],
  "Bebidas › Jugos": [
    {
      "nombre": "Jugo Líquido Sabor Multifruta 1 Lts Cepita",
      "marca": "Cepita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/921797/7790895647123.jpg?v=639196293823300000",
      "fuente_url": "https://www.disco.com.ar/jugo-cepita-del-valle-multifruta-1-lt/p"
    },
    {
      "nombre": "Jugo Sabor Manzana 1 Lts Cepita",
      "marca": "Cepita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/921795/7790895647017.jpg?v=639196293612230000",
      "fuente_url": "https://www.disco.com.ar/jugo-cepita-del-valle-manzana-1-lt/p"
    },
    {
      "nombre": "Jugo Sabor Manzana 1 Lts Citric",
      "marca": "Citric",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/684673/Jugo-Citric-Manzana-1l-1-883115.jpg?v=637780305787170000",
      "fuente_url": "https://www.disco.com.ar/jugo-de-manzana-1-l-citric/p"
    },
    {
      "nombre": "Jugo Sabor Naranja 1 Lts Cepita",
      "marca": "Cepita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/921811/7790895648267.jpg?v=639196295705000000",
      "fuente_url": "https://www.disco.com.ar/jugo-naranja-tentacion-1-lts-cepita-del-valle/p"
    }
  ],
  "Bebidas › Jugos en Polvo": [
    {
      "nombre": "Jugo En Polvo Ananá 7 Grs Clight",
      "marca": "Clight",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/895183/Jugo-En-Polvo-Clight-Anan-7-Gr-1-941073.jpg?v=639033970149800000",
      "fuente_url": "https://www.disco.com.ar/jugo-en-polvo-anana-7-grs-clight/p"
    },
    {
      "nombre": "Jugo en Polvo Sabor Limonada 8 Grs Clight",
      "marca": "Clight",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/895184/Jugo-En-Polvo-Clight-Limonada-8-Gr-1-941108.jpg?v=639033970154730000",
      "fuente_url": "https://www.disco.com.ar/jugo-en-polvo-limonada-8-grs-clight/p"
    },
    {
      "nombre": "Jugo en Polvo Sabor Manzana 15 Grs Tang",
      "marca": "Tang",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/806220/Jugo-En-Polvo-Tang-Sabor-Manzana-15g-1-941125.jpg?v=638400009864130000",
      "fuente_url": "https://www.disco.com.ar/jugo-en-polvo-tang-manzana-15gr-2/p"
    },
    {
      "nombre": "Jugo En Polvo Tang Galactico 15gr",
      "marca": "Tang",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/883546/Jugo-En-Polvo-Galactivo-15Gr-Tang-Jugo-En-Polvo-Tang-Galactico-15gr-1-1047930.jpg?v=638936446384730000",
      "fuente_url": "https://www.disco.com.ar/jugo-en-polvo-tang-galactico-15gr/p"
    }
  ],
  "Congelados › Hamburguesas": [
    {
      "nombre": "Hamburguesas Paty De Cancha 10 U - 1250 Gr",
      "marca": "Paty",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/774037/Hamburguesas-Paty-De-Cancha-X-12-Unidades-1250grs-1-920654.jpg?v=638146534092900000",
      "fuente_url": "https://www.disco.com.ar/hamburguesas-paty-de-cancha-10-u-1250-gr/p"
    },
    {
      "nombre": "Hamburguesas Paty De Carne Flow Grandes 2 U - 240 Gr",
      "marca": "Paty",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/773993/Hamburguesas-Paty-De-Carne-Flow-Grandes-2-U-240-Gr-1-15883.jpg?v=638146533952400000",
      "fuente_url": "https://www.disco.com.ar/hamburguesas-paty-de-carne-flow-grandes-2-u-240-gr/p"
    },
    {
      "nombre": "Hamburguesas Union Ganadera Finitas  2 U - 110 Gr",
      "marca": "Unión Ganadera",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/915103/7793281493519.jpg?v=639144496413230000",
      "fuente_url": "https://www.disco.com.ar/hamburguesas-union-ganadera-finitas-2-u-110-gr/p"
    },
    {
      "nombre": "Hamburguesas Union Ganadera Gigantes 2 U - 110 Gr",
      "marca": "Unión Ganadera",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/915105/7793281493557.jpg?v=639144497339270000",
      "fuente_url": "https://www.disco.com.ar/hamburguesas-union-ganadera-gigantes-2-u-110-gr/p"
    }
  ],
  "Desayuno y Merienda › Café Instantáneo": [
    {
      "nombre": "Café Instantáneo Original 100 Grs Dolca",
      "marca": "Dolca",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/915493/8445291082199.jpg?v=639147347660630000",
      "fuente_url": "https://www.disco.com.ar/cafe-original100-grs-nescafe-dolca/p"
    },
    {
      "nombre": "Café Instantáneo Original 170 Grs Dolca",
      "marca": "Dolca",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/915497/8445291082212.jpg?v=639147348293830000",
      "fuente_url": "https://www.disco.com.ar/cafe-original-frasco-170-grs-nescafe-dolca/p"
    },
    {
      "nombre": "Café Instantáneo Original 50 Grs Dolca",
      "marca": "Dolca",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/915489/8445291082175.jpg?v=639147347180070000",
      "fuente_url": "https://www.disco.com.ar/cafe-original-50-grs-nescafe-dolca/p"
    },
    {
      "nombre": "Café Instantáneo Tradición 160 Grs Nescafe",
      "marca": "Nescafé",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/916342/Cafe-Nescafe-Tradicion-160gr-1-1058843.jpg?v=639156010184030000",
      "fuente_url": "https://www.disco.com.ar/cafe-nescafe-tradicion-160gr/p"
    }
  ],
  "Desayuno y Merienda › Té": [
    {
      "nombre": "Té en Saquitos Mezcla de Hierbas x 20 Un Taragui",
      "marca": "Taragüi",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/836153/T-Taragui-Silvestre-Mezcla-De-Hierbas-1-5gr-T-Taragui-Silvestre-Mezcla-De-Hierbas-1-5-Gr-1-1026448.jpg?v=638633290341770000",
      "fuente_url": "https://www.disco.com.ar/te-taragui-silvestre-mezcla-de-hierbas-1-5-gr/p"
    },
    {
      "nombre": "Té Taragui Internacional 50 Saquitos",
      "marca": "Taragüi",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/577382/Te-Taragui-Internacional-En-Saquitos-50-U-1-41244.jpg?v=637196658594130000",
      "fuente_url": "https://www.disco.com.ar/te-taragui-internacional-50-saquitos/p"
    },
    {
      "nombre": "Te Tilo La Virginia 25 Saquitos",
      "marca": "La Virginia",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/895839/Te-Tilo-La-Virginia-25-Saquitos-1-870809.jpg?v=639046065783700000",
      "fuente_url": "https://www.disco.com.ar/te-tilo-la-virginia-25-saquitos/p"
    },
    {
      "nombre": "Té Verde En Saquitos Taragui 20 Saquitos",
      "marca": "Taragüi",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/577373/Te-Verde-Taragui-En-Saquitos-20-U-1-31613.jpg?v=637196658570330000",
      "fuente_url": "https://www.disco.com.ar/te-verde-en-saquitos-taragui-20-saquitos/p"
    }
  ],
  "Desayuno y Merienda › Yerba Mate": [
    {
      "nombre": "CBSé Yerba Mate Naranja 500 g",
      "marca": "CBSé",
      "imagen_url": "https://www.pampadrugstore.net/5372-thickbox_default/yerba-mate-cbse-naranja-x-500-g.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/yerba-mate/yerba-mate-cbse-naranja-x-500-g.html"
    },
    {
      "nombre": "Playadito Yerba Mate Despalada 500 g",
      "marca": "Playadito",
      "imagen_url": "https://www.pampadrugstore.net/2616-thickbox_default/yerba-mate-playadito-despalada-x-500-grs.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/yerba-mate/yerba-mate-playadito-despalada-x-500-grs.html"
    },
    {
      "nombre": "Taragüi Yerba Mate con Palo 1 kg",
      "marca": "Taragüi",
      "imagen_url": "https://www.pampadrugstore.net/864-thickbox_default/yerba-mate-taraguei-x-1-kg.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/yerba-mate/yerba-mate-taraguei-x-1-kg.html"
    },
    {
      "nombre": "Yerba Mate Monte La Merced 500 Gr",
      "marca": "La Merced",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/621308/Yerba-Mate-La-Merced-Monte-O-c-500g-1-857357.jpg?v=637473138280300000",
      "fuente_url": "https://www.disco.com.ar/yerba-mate-monte-la-merced-500-gr/p"
    },
    {
      "nombre": "Yerba Mate Sin Palo 500 Grs Taragui",
      "marca": "Taragüi",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/621305/Yerba-Mate-Taragui-4flex-Sin-Palo-500g-1-857354.jpg?v=637473138272170000",
      "fuente_url": "https://www.disco.com.ar/yerba-mate-4flex-sin-palo-taragui-500-gr/p"
    },
    {
      "nombre": "Yerba Mate Suave 1 Kg Playadito",
      "marca": "Playadito",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/711224/Yerba-Mate-Playadito-Suave-X1kg-1-854539.jpg?v=637938633804770000",
      "fuente_url": "https://www.disco.com.ar/yerba-mate-playadito-suave-1-kg/p"
    }
  ],
  "Ferretería › Pilas": [
    {
      "nombre": "Pilas Alcalinas Aaa Blister De 4 Un Duracell",
      "marca": "Duracell",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/932635/44330301021-1.jpg?v=639262901172070000",
      "fuente_url": "https://www.disco.com.ar/pilas-alcalinas-aaa-blister-de-4-un-duracell/p"
    },
    {
      "nombre": "Pilas Alcalinas Energizer Aa 2 U",
      "marca": "Energizer",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/697611/Pilas-Alcalinas-Energizer-Aa-2-U-1-34704.jpg?v=637862385743400000",
      "fuente_url": "https://www.disco.com.ar/pilas-alcalinas-energizer-aa-2-u/p"
    },
    {
      "nombre": "Pilas Alcalinas Energizer Aa 4 U",
      "marca": "Energizer",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/697612/Pilas-Alcalinas-Energizer-Aa-4-U-1-34791.jpg?v=637862385746070000",
      "fuente_url": "https://www.disco.com.ar/pilas-alcalinas-energizer-aa-4-u/p"
    },
    {
      "nombre": "Pilas Alcalinas Energizer Aaa 4 U",
      "marca": "Energizer",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/697614/Pilas-Alcalinas-Energizer-Aaa-4-U-1-35604.jpg?v=637862385752170000",
      "fuente_url": "https://www.disco.com.ar/pilas-alcalinas-energizer-aaa-4-u/p"
    }
  ],
  "Fiambres › Jamones": [
    {
      "nombre": "Jamon Cocido Fetas Finas 200 Grs Paladini",
      "marca": "Paladini",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/881228/21610902004.jpg?v=638918376642030000",
      "fuente_url": "https://www.disco.com.ar/jamon-paladini-cocido-fetas-finas-x-200-gr/p"
    },
    {
      "nombre": "Jamón Cocido Feteado 1 Kg Paladini",
      "marca": "Paladini",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/833612/Jam-n-Cocido-Paladini-Feteado-1-Kg-1-21110.jpg?v=638615037658000000",
      "fuente_url": "https://www.disco.com.ar/jamon-cocido-paladini-feteado-1-kg/p"
    }
  ],
  "Golosinas › Alfajores": [
    {
      "nombre": "Alfajor Negro Guaymallen 228 Gr",
      "marca": "Guaymallén",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/765914/Alfajor-Negro-Guaymallen-228-Gr-1-202845.jpg?v=638100849781000000",
      "fuente_url": "https://www.disco.com.ar/alfajor-negro-guaymallen-228-gr/p"
    },
    {
      "nombre": "Alfajor Triple Chocolate 255grs Fantoche",
      "marca": "Fantoche",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/886846/Alfajor-Triple-Chocolate-255grs-Fantoche-1-1049402.jpg?v=638961285783700000",
      "fuente_url": "https://www.disco.com.ar/alfajor-triple-chocolate-255grs-fantoche/p"
    },
    {
      "nombre": "Havanna Alfajores Mixtos Caja x 12",
      "marca": "Havanna",
      "imagen_url": "https://www.pampadrugstore.net/874-thickbox_default/alfajor-havanna-mixto-caja-x-12.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/alfajores-argentinos/alfajor-havanna-mixto-caja-x-12.html"
    }
  ],
  "Golosinas › Caramelos": [
    {
      "nombre": "Caramelos Gajitos Surtido 80 Grs Arcor",
      "marca": "Arcor",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/872695/Caramelos-Gajitos-Surtido-80-Grs-Arcor-1-1039156.jpg?v=638865597919830000",
      "fuente_url": "https://www.disco.com.ar/caramelo-gajitos-stdo-arcor-80-gr/p"
    },
    {
      "nombre": "Caramelos Pico Dulce 150 Gr",
      "marca": "Lheritier",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/339834/Caramelo-Duro-Pico-Dulce-Frutal-X-150-Gramos-bsa-gr-150-1-11351.jpg?v=636439394855070000",
      "fuente_url": "https://www.disco.com.ar/caramelos-pico-dulce-150-gr/p"
    },
    {
      "nombre": "Caramelos Rellenos Frutales 80 Grs Arcor",
      "marca": "Arcor",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/872694/Caramelos-Rellenos-Frutales-80-Grs-Arcor-1-1039155.jpg?v=638865597917500000",
      "fuente_url": "https://www.disco.com.ar/caramelo-rellenos-frutales-arcor-80-gr/p"
    },
    {
      "nombre": "Caramelos Rellenos Miel 80 Grs Arcor",
      "marca": "Arcor",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/872692/Caramelos-Rellenos-Miel-80-Grs-Arcor-1-1039153.jpg?v=638865597911000000",
      "fuente_url": "https://www.disco.com.ar/caramelo-rellenos-miel-arcor-80-gr/p"
    }
  ],
  "Golosinas › Chocolates": [
    {
      "nombre": "Arcor Bon o Bon Chocolate Blanco 15 g",
      "marca": "Arcor",
      "imagen_url": "https://www.pampadrugstore.net/1783-thickbox_default/bon-o-bon-chocolate-blanco-15-grs.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/golosinas/bon-o-bon-chocolate-blanco-15-grs.html"
    },
    {
      "nombre": "Chocolate Aireado Cofler  27 Gr",
      "marca": "Cofler",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/583086/Chocolate-Cofler-Aireado-27-Gr-1-40257.jpg?v=637234676601430000",
      "fuente_url": "https://www.disco.com.ar/chocolate-aireado-cofler-27-gr/p"
    },
    {
      "nombre": "Chocolate Lindt Swiss Premium Chocolate Con Leche X300g",
      "marca": "Lindt",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/777231/Chocolate-Lindt-Milk-Con-Leche-Gold-Milk-Rasisn-Hazelnut-Tabla-100-G-1-59649.jpg?v=638173641717870000",
      "fuente_url": "https://www.disco.com.ar/chocolate-lindt-swiss-premium-chocolate-con-leche-x300g/p"
    }
  ],
  "Golosinas › Turrones": [
    {
      "nombre": "Arcor Turrón de Maní Pack x 10",
      "marca": "Arcor",
      "imagen_url": "https://www.pampadrugstore.net/1775-thickbox_default/turron-de-mani-arcor-x-10-uds.jpg",
      "fuente_url": "https://www.pampadrugstore.net/es/golosinas/turron-de-mani-arcor-x-10-uds.html"
    }
  ],
  "Higiene Personal › Cepillos Dentales": [
    {
      "nombre": "Cepillo De Dientes Colgate Extra Clean Medio 1 U",
      "marca": "Colgate",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/836616/Cepillo-De-Dientes-Colgate-Extra-Clean-Medio-1-U-1-717654.jpg?v=638634155233470000",
      "fuente_url": "https://www.disco.com.ar/cepillo-de-dientes-colgate-extra-clean-medio-1-u/p"
    },
    {
      "nombre": "Cepillo Dental Medio Extra Clean x 3 Un Colgate",
      "marca": "Colgate",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/833360/Cepillo-Dental-Colgate-Extra-Clean-Medio-Cerdas-Multinivel-3u-1-28703.jpg?v=638610936395070000",
      "fuente_url": "https://www.disco.com.ar/cepillo-dental-colgate-extra-clean-medio-cerdas-multinivel-3u/p"
    },
    {
      "nombre": "Cepillo Dental Medio Indicator x 2 Un Oral-B",
      "marca": "Oral-B",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/640748/Cepillo-Dental-Oral-b-Indicator-2-Unidades-1-15534.jpg?v=637556947594300000",
      "fuente_url": "https://www.disco.com.ar/cepillo-oral-b-indicator-medio-x2/p"
    },
    {
      "nombre": "Cepillo Dental Suave Indicator x 4 Un Oral-B",
      "marca": "Oral-B",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/639556/Cepillo-Dental-Oral-b-Indicator-Cl-sico-4-U-1-38220.jpg?v=637552632226400000",
      "fuente_url": "https://www.disco.com.ar/cepillo-oral-b-indicator-suave-x4/p"
    }
  ],
  "Higiene Personal › Pastas Dentales": [
    {
      "nombre": "Pasta Dental Colgate Luminous Charcoal 90 G",
      "marca": "Colgate",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/932662/13220102204.jpg?v=639262934120430000",
      "fuente_url": "https://www.disco.com.ar/pasta-dental-colgate-luminous-charcoal-90-g/p"
    },
    {
      "nombre": "Pasta Dental Kolynos Frescura 123 90 Grs",
      "marca": "Kolynos",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/897547/Pasta-Dental-Kolynos-Frescura-123-90-Grs-1-861913.jpg?v=639056650047070000",
      "fuente_url": "https://www.disco.com.ar/pasta-dental-kolynos-frescura-123-90-grs/p"
    },
    {
      "nombre": "Pasta Dental Sensitive Pro Alivio Blanqueadora 110 Grs Colgate",
      "marca": "Colgate",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/859763/Pasta-Dental-Colgate-Sensitive-Pro-alivio-Real-White-110-Gr-1-28240.jpg?v=638781681827270000",
      "fuente_url": "https://www.disco.com.ar/pasta-dental-colgate-sensitive-pro-alivio-real-white-110-gr/p"
    },
    {
      "nombre": "Pasta Dental Total Encías Saludables 90 Grs Colgate",
      "marca": "Colgate",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/870166/Pasta-Dental-Total-Enc-as-Saludables-Con-Fl-or-90-Gr-Colgate-1-869743.jpg?v=638846482052200000",
      "fuente_url": "https://www.disco.com.ar/pasta-dental-encias-saludables-con-fluor-90-grs-colgate-total/p"
    }
  ],
  "Lácteos › Dulce de Leche": [
    {
      "nombre": "Vacalin Dulce de Leche Original 450 g",
      "marca": "Vacalin",
      "imagen_url": "https://www.vacalin.com/img_subcategorias/082715374451_DDL450g-2023-RGB.png",
      "fuente_url": "https://www.vacalin.com/productos/original/1"
    },
    {
      "nombre": "Vacalin Dulce de Leche Repostero 400 g",
      "marca": "Vacalin",
      "imagen_url": "https://www.vacalin.com/img_subcategorias/021114024637_DDLRepostero400g-2023-RGB.png",
      "fuente_url": "https://www.vacalin.com/productos/repostero/3"
    }
  ],
  "Lácteos › Leches": [
    {
      "nombre": "Leche Descremada 1 Lts Milkaut",
      "marca": "Milkaut",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/843087/Leche-Uat-Milkaut-Descremada-1l-1-1019776.jpg?v=638654784467600000",
      "fuente_url": "https://www.disco.com.ar/leche-uat-milkaut-descremada-1l/p"
    },
    {
      "nombre": "Leche Entera 1 Lts Milkaut",
      "marca": "Milkaut",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/841054/Leche-Uat-Milkaut-Entera-1l-1-1019774.jpg?v=638652948533930000",
      "fuente_url": "https://www.disco.com.ar/leche-uat-milkaut-entera-1l/p"
    },
    {
      "nombre": "Leche La Serenisima Entera 200cc",
      "marca": "La Serenísima",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/853907/Leche-La-Serenisima-Entera-200cc-Leche-Uat-Entera-La-Serenisima-3-200cc-1-870681.jpg?v=638733299891370000",
      "fuente_url": "https://www.disco.com.ar/leche-la-serenisima-entera-200cc/p"
    }
  ],
  "Lácteos › Mantecas": [
    {
      "nombre": "Manteca Clásica 100 Grs La Serenisima",
      "marca": "La Serenísima",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/853857/Manteca-La-Serenisima-100-Gr-1-6158.jpg?v=638733298518000000",
      "fuente_url": "https://www.disco.com.ar/manteca-la-serenisima-100-gr/p"
    },
    {
      "nombre": "Manteca Clásica 200 Grs La Serenisima",
      "marca": "La Serenísima",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/853858/Manteca-Ls-Bienestar-Animal-200-G-1-6236.jpg?v=638733298521200000",
      "fuente_url": "https://www.disco.com.ar/manteca-ls-bienestar-animal-200-g/p"
    },
    {
      "nombre": "Manteca Light 200 Grs La Serenisima",
      "marca": "La Serenísima",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/853911/Manteca-Light-La-Serenisima-200gr-1-875108.jpg?v=638733299904430000",
      "fuente_url": "https://www.disco.com.ar/manteca-light-la-serenisima-200gr/p"
    },
    {
      "nombre": "Manteca Tradicional 200 Grs La Paulina",
      "marca": "La Paulina",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/887704/Manteca-La-Paulina-200-Gr-1-6370.jpg?v=638969169722630000",
      "fuente_url": "https://www.disco.com.ar/manteca-la-paulina/p"
    }
  ],
  "Lácteos › Quesos": [
    {
      "nombre": "Queso Rallado Ilolay 120 Gr",
      "marca": "Ilolay",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/853319/Queso-Rallado-Ilolay-120-Gr-1-843912.jpg?v=638730057692930000",
      "fuente_url": "https://www.disco.com.ar/queso-rallado-ilolay-120-gr/p"
    },
    {
      "nombre": "Queso Untable de Queso Azul x 190 Grs La Paulina",
      "marca": "La Paulina",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/932993/Queso-Untable-La-Paulina-Fundido-Azul-190-Gr-1-1065992.jpg?v=639265089706600000",
      "fuente_url": "https://www.disco.com.ar/queso-untable-la-paulina-fundido-azul-190-gr/p"
    }
  ],
  "Lácteos › Yogures": [
    {
      "nombre": "Yogur Entero Frutilla Tregar125g",
      "marca": "Tregar",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/776282/Yogur-Entero-Frutilla-Tregar-125g-1-950189.jpg?v=638167377668730000",
      "fuente_url": "https://www.disco.com.ar/yogur-entero-frutilla-tregar125g/p"
    },
    {
      "nombre": "Yogur Frutilla Sachet X 900 Gr Ilolay",
      "marca": "Ilolay",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/854492/Yogur-Ilolay-Frutilla-Sachet-900g-1-1032750.jpg?v=638742153920000000",
      "fuente_url": "https://www.disco.com.ar/yogur-frutilla-sachet-x-900-gr-ilolay/p"
    },
    {
      "nombre": "Yogur Sabor Frutilla Griego 140 Grs Yogurisimo",
      "marca": "Yogurísimo",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/920812/Yogur-Griego-Frutilla-X-140-Grs-Yogur-simo-1-1060213.jpg?v=639186105711970000",
      "fuente_url": "https://www.disco.com.ar/yogur-griego-frutilla-x-140-grs-yogurisimo/p"
    },
    {
      "nombre": "Yogur Sabor Natural Griego 190 Grs Yogurisimo",
      "marca": "Yogurísimo",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/920814/Yogur-Griego-Firme-Natural-X-190-Grs-Yogurisimo-1-1060215.jpg?v=639186112180870000",
      "fuente_url": "https://www.disco.com.ar/yogur-griego-firme-natural-x-190-grs-yogurisimo/p"
    }
  ],
  "Librería › Lápices": [
    {
      "nombre": "Lapices Colores Duo X 12 Maped",
      "marca": "Maped",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/556004/Lapices-De-Colores-Maped-Duo-X-12---24-s-e-un-1-1-188035.jpg?v=637104210794630000",
      "fuente_url": "https://www.disco.com.ar/lapices-colores-duo-x-12-maped/p"
    },
    {
      "nombre": "Lápices Maped Cortos Caja de Cartón x 12",
      "marca": "Maped",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/556443/Lapices-X-12-Maped-Caja-Carton-Cortos-1-76456.jpg?v=637106816457100000",
      "fuente_url": "https://www.disco.com.ar/lapices-maped-caja-carton-cortos/p"
    }
  ],
  "Limpieza › Desinfectantes": [
    {
      "nombre": "Desinfectante Bebé Aerosol 360ml Lysoform",
      "marca": "Lysoform",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/900180/Desinfectante-De-Ambiente-Beb-Aerosol-360ml-Lysoform-1-880337.jpg?v=639074797451970000",
      "fuente_url": "https://www.disco.com.ar/desinfectante-aerosol-bebe-360-ml-lysoform/p"
    },
    {
      "nombre": "Limpiador Desinfectante Lavanda 800ml Lysoform",
      "marca": "Lysoform",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/900155/Desinfectante-L-quido-Pisos-Original-900ml-Lysoform-1-870788.jpg?v=639074797341570000",
      "fuente_url": "https://www.disco.com.ar/limpiador-desinfectante-lavanda-800-ml-lysoform/p"
    },
    {
      "nombre": "Limpiador Desinfectante Original 800ml Lysoform",
      "marca": "Lysoform",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/900154/Desinfectante-Concentrado-Pisos-Original-900ml-Lysoform-1-870781.jpg?v=639074797337470000",
      "fuente_url": "https://www.disco.com.ar/limpiador-desinfectante-original-800-ml-lysoform/p"
    }
  ],
  "Limpieza › Detergentes": [
    {
      "nombre": "Detergente Active Gel Original 500 Ml Cif",
      "marca": "Cif",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/932383/Lavavajilla-Cif-Concentrado-Active-Gel-Original-500ml-1-1049671.jpg?v=639259475669770000",
      "fuente_url": "https://www.disco.com.ar/lavavajilla-cif-concentrado-active-gel-original-500ml/p"
    },
    {
      "nombre": "Detergente Bioactive Limón Botella 300 Ml Cif",
      "marca": "Cif",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/933977/Detergente-Bioactive-Lim-n-Botella-300-Ml-Cif-1-986703.jpg?v=639280209914030000",
      "fuente_url": "https://www.disco.com.ar/detergente-bioactive-limon-botella-300-ml-cif/p"
    },
    {
      "nombre": "Detergente para Lavavajillas Limón 450 Ml Cif",
      "marca": "Cif",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/856882/Detergente-Bioactive-Lim-n-Doypack-450-Ml-Cif-Detergente-Bioactive-Cif-Lim-n-Doypack-450-Ml-1-986730.jpg?v=638755979878870000",
      "fuente_url": "https://www.disco.com.ar/detergente-bioactive-cif-limon-doypack-450-ml/p"
    },
    {
      "nombre": "Detergente para Lavavajillas Limón Cremoso 500 Ml Magistral",
      "marca": "Magistral",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/892982/Detergente-Ultra-Lim-n-Cremoso-X-500-Ml-Magistral-1-1030450.jpg?v=639003731840300000",
      "fuente_url": "https://www.disco.com.ar/detergente-ultra-limon-cremoso-x-500-ml-magistral/p"
    }
  ],
  "Limpieza › Esponjas": [
    {
      "nombre": "Esponja Clasica Scotch Brite",
      "marca": "Scotch-Brite",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/529332/Esponja-Antibacterias-Scotch-Brite-Clasica-Multiuso-1-U-1-102395.jpg?v=636898152780870000",
      "fuente_url": "https://www.disco.com.ar/esponja-clasica-scotch-brite-2/p"
    },
    {
      "nombre": "Esponja Cuadriculada Antibacterial 1 Un Mortimer",
      "marca": "Mortimer",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/565812/Esponja-Cuadriculada-Mortimer-Antibacterial-1-U-1-30369.jpg?v=637130136577700000",
      "fuente_url": "https://www.disco.com.ar/esponja-mortimer-cuadriculada-antibacterial/p"
    },
    {
      "nombre": "Esponja de Acero Inoxidable 16 Grs Virulana",
      "marca": "Virulana",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/180493/Esponja-Virulana-Esponja-Virulana---Bsa-1-Un-1-12391.jpg?v=636383396551270000",
      "fuente_url": "https://www.disco.com.ar/esponja-virulana-inoxy/p"
    },
    {
      "nombre": "Esponja de Bronce 12 Grs Virulana",
      "marca": "Virulana",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/178397/Esponja-Virulana-De-Bronce-Esponja-Virulana-De-Bronce-223-Paquete-1-U-1-6041.jpg?v=636383362509600000",
      "fuente_url": "https://www.disco.com.ar/esponja-virulana-de-bronce-223/p"
    }
  ],
  "Limpieza › Jabones para Ropa": [
    {
      "nombre": "Jabón Líquido para Ropa 800 Ml Ace",
      "marca": "Ace",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/892983/Jabon-Liquido-Ace-Cl-sico-Dp-800ml-1-1031063.jpg?v=639003731844370000",
      "fuente_url": "https://www.disco.com.ar/jabon-liquido-ace-clasico-dp-800ml/p"
    },
    {
      "nombre": "Jabón Líquido para Ropa Evolution 3 Lts Zorro",
      "marca": "Zorro",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/892889/Jabon-L-quido-Zorro-Escudo-Protector-Dp-3l-1-941785.jpg?v=639003731362830000",
      "fuente_url": "https://www.disco.com.ar/jabon-liquido-evolution-3-lts-zorro/p"
    },
    {
      "nombre": "Jabón Líquido para Ropa Platinum 3 Lts Ariel",
      "marca": "Ariel",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/892964/Jabon-Liquido-Ariel-Platinum-Dp-3000-Ml-1-1021710.jpg?v=639003731685170000",
      "fuente_url": "https://www.disco.com.ar/jabon-liquido-ropa-3-lts-ariel/p"
    },
    {
      "nombre": "Jabón para Ropa Eco Lavado Coco 200 Grs Ala",
      "marca": "Ala",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/856856/Jab-n-En-Barra-Ala-Ecolavado-200-Gr-1-944078.jpg?v=638755979796370000",
      "fuente_url": "https://www.disco.com.ar/jabon-en-barra-ala-ecolavado-200-gr/p"
    }
  ],
  "Limpieza › Lavandinas": [
    {
      "nombre": "Ayudín Lavandina Gel Expert Floral 700 ml",
      "marca": "Ayudín",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/876947/Ayud-n-Lavandina-En-Gel-Floral-700ml-1-875187.jpg?v=638884497664030000",
      "fuente_url": "https://www.disco.com.ar/ayudin-lavandina-en-gel-floral-700ml/p"
    },
    {
      "nombre": "Ayudín Lavandina Gel Expert Original 700 ml",
      "marca": "Ayudín",
      "imagen_url": "https://farmacityar.vteximg.com.br/arquivos/ids/261508/241156_ayudin-lavandina-gel-expert-original-x-700-ml_imagen-1.jpg?v=638647699669270000",
      "fuente_url": "https://www.farmacity.com/ayudin-lavandina-gel-expert-original-x-700-ml/p"
    },
    {
      "nombre": "Lavandina Glaciar 2000 Ml Ayudín",
      "marca": "Ayudín",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/624185/Lav-Ayudin-Pureza-Glaciar-Triple-Pod-2l-1-858806.jpg?v=637505976781630000",
      "fuente_url": "https://www.disco.com.ar/lavandina-ayudin-glaciar-triple-poder-2l/p"
    },
    {
      "nombre": "Lavandina Líquida 1 Lts Ayudín",
      "marca": "Ayudín",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/678918/Lavandina-Ayud-n-Cl-sica-1-L-1-248228.jpg?v=637739051222130000",
      "fuente_url": "https://www.disco.com.ar/lavandina-ayudin-clasica-1-l/p"
    },
    {
      "nombre": "Lavandina Líquida 4 Lts Ayudín",
      "marca": "Ayudín",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/833135/Lavandina-Ayudin-Original-4-L-1-1024925.jpg?v=638610934446470000",
      "fuente_url": "https://www.disco.com.ar/lavandina-ayudin-original-4-l/p"
    }
  ],
  "Limpieza › Limpiadores de Pisos": [
    {
      "nombre": "Limpiador de Pisos Espíritu Play 1.8 Lts Poett",
      "marca": "Poett",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/761367/Limpiador-Desinfectante-De-Pisos-Poett-Esp-ritu-Play-1-8-L-1-858644.jpg?v=638053546115530000",
      "fuente_url": "https://www.disco.com.ar/limpiador-liquido-aromatizante-poett-espiritu-play-1-8-l/p"
    },
    {
      "nombre": "Limpiador de Pisos Flores de Primavera 1.8 Lts Poett",
      "marca": "Poett",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/761353/Limpiador-Desinfectante-De-Pisos-Poett-Flores-De-Primavera-1-8-L-1-855489.jpg?v=638053546066570000",
      "fuente_url": "https://www.disco.com.ar/limpiador-liquido-aromatizante-poett-flores-de-primavera-1-8-l/p"
    },
    {
      "nombre": "Limpiador de Pisos Frescura de Lavanda 1.8 Lts Poett",
      "marca": "Poett",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/761349/Limpiador-Desinfectante-De-Pisos-Poett-Lavanda-1-8-L-1-855465.jpg?v=638053546055130000",
      "fuente_url": "https://www.disco.com.ar/limpiador-liquido-aromatizante-poett-frescura-de-lavanda-1-8-lts/p"
    },
    {
      "nombre": "Limpiador de Pisos Oxygel 750 Ml Cif",
      "marca": "Cif",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/932310/Limpiador-Pisos-Cif-Bioactive-Oxygel-Botella-750-Ml-1-938842.jpg?v=639259475254500000",
      "fuente_url": "https://www.disco.com.ar/limpiador-pisos-cif-bioactive-oxygel-botella-750-ml/p"
    }
  ],
  "Limpieza › Quitamanchas": [
    {
      "nombre": "Quitamanchas Prelavado 400 Ml Vanish",
      "marca": "Vanish",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/720227/Quitamanchas-Vanish-Pre-wash-400-Ml-1-6532.jpg?v=637992095838000000",
      "fuente_url": "https://www.disco.com.ar/vanish-quitamanchas-prelavado-rosa-400ml/p"
    },
    {
      "nombre": "Quitamanchas Trenet Bolilla 120ml",
      "marca": "Trenet",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/789136/Quitamanchas-Trenet-Bolilla-120ml-1-247918.jpg?v=638260689767030000",
      "fuente_url": "https://www.disco.com.ar/quitamanchas-trenet-bolilla-120ml/p"
    },
    {
      "nombre": "Quitamanchas Vanish Polvo Rosa 120g",
      "marca": "Vanish",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/720234/Quitamanchas-Vanish-120-Gr-1-12817.jpg?v=637992095859070000",
      "fuente_url": "https://www.disco.com.ar/quitamanchas-vanish-polvo-rosa-120g/p"
    }
  ],
  "Limpieza › Suavizantes": [
    {
      "nombre": "Suavizante Clasico Mas Intenso Dp 900ml Vivere",
      "marca": "Vivere",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/932387/Suavizante-Clasico-Mas-Intenso-Dp-900ml-Vivere-1-1050684.jpg?v=639259475688370000",
      "fuente_url": "https://www.disco.com.ar/suavizante-clasico-mas-intenso-dp-900ml-vivere/p"
    },
    {
      "nombre": "Suavizante Comfort  Concentrado Energia Floral 500ml",
      "marca": "Comfort",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930173/Suavizante-Comfort-Concentrado-Energia-Floral-500ml-1-1008498.jpg?v=639252781750970000",
      "fuente_url": "https://www.disco.com.ar/suavizante-comfort-concentrado-energia-floral-500ml/p"
    },
    {
      "nombre": "Suavizante Concentrado Lavanda 450 Ml Comfort",
      "marca": "Comfort",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/883365/Suavizante-Comfort-Explosion-De-Lavanda-Dp-450-1-1048247.jpg?v=638935581815400000",
      "fuente_url": "https://www.disco.com.ar/suavizante-comfort-concentrado-explosion-de-lavanda-dp-450ml/p"
    },
    {
      "nombre": "Suavizante Tropical 500 Ml Downy",
      "marca": "Downy",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/915621/Suavizante-Downy-Tropical-500ml-1-1058552.jpg?v=639148989893900000",
      "fuente_url": "https://www.disco.com.ar/suavizante-tropical-500-ml-downy/p"
    }
  ],
  "Mascotas › Alimentos Húmedos para Gatos": [
    {
      "nombre": "Alimento Para Gato Humedo Whiskas Adulto Pollo 85gr",
      "marca": "Whiskas",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/586430/Alimento-Para-Gatos-Whiskas-Pasta-Pollo-85-Gr-1-42087.jpg?v=637265784247930000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-gato-humedo-whiskas-adulto-pollo-85gr/p"
    },
    {
      "nombre": "Alimento Para Gato Humedo Whiskas Adulto Salmon 85gr",
      "marca": "Whiskas",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/586411/Alimento-Para-Gatos-Whiskas-Pasta-Salmon-85-Gr-1-22182.jpg?v=637265784197070000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-gato-humedo-whiskas-adulto-salmon-85gr/p"
    }
  ],
  "Mascotas › Alimentos Secos para Gatos": [
    {
      "nombre": "Alimento Para Gato Sabrositos Adulto Mediano/grande Pescado 1kg",
      "marca": "Sabrositos",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/918813/7798073177226.jpg?v=639173084895000000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-gato-sabrositos-adulto-mediano-grande-pescado-1kg/p"
    },
    {
      "nombre": "Alimento Para Gato Whiskas Adulto Carne 0.5kg",
      "marca": "Whiskas",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/760162/Alimento-Whiskas-Para-Gatos-Carne-500gr-1-814250.jpg?v=638048146501900000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-gato-whiskas-adulto-carne-0-5kg/p"
    }
  ],
  "Mascotas › Alimentos Secos para Perros": [
    {
      "nombre": "Alimento Para Perro Pedigree Adulto Pequeño Carne Y Vegetales 0.5kg",
      "marca": "Pedigree",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/928609/Alimento-Para-Perro-Pedigree-Adulto-Peque-o-Carne-Y-Vegetales-0-5kg-1-1065063.jpg?v=639250838242500000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-perro-pedigree-adulto-pequeno-carne-y-vegetales-0-5kg-2/p"
    },
    {
      "nombre": "Alimento Para Perro Pedigree Adulto Pequeño Carne Y Vegetales 3kg",
      "marca": "Pedigree",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/928610/Alimento-Para-Perro-Pedigree-Adulto-Peque-o-Carne-Y-Vegetales-3kg-1-1065064.jpg?v=639250838660270000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-perro-pedigree-adulto-pequeno-carne-y-vegetales-3kg-2/p"
    },
    {
      "nombre": "Alimento Para Perro Pedigree Cachorro Mediano Grande Carne Y Pollo 3kg",
      "marca": "Pedigree",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/760153/Alimento-Para-Perros-Pedigree-Cachorros-3-Kg-1-38593.jpg?v=638048145829570000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-perro-pedigree-cachorro-mediano-grande-carne-y-pollo-3kg/p"
    },
    {
      "nombre": "Alimento Para Perro Sabrositos Mordida Pequeña Carne Y Cereales 1.5kg",
      "marca": "Sabrositos",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/933177/7798073177585.jpg?v=639269137553430000",
      "fuente_url": "https://www.disco.com.ar/alimento-para-perro-sabrositos-mordida-pequena-carne-y-cereales-1-5kg/p"
    }
  ],
  "Panificados › Pan de Molde": [
    {
      "nombre": "Pan Blanco 315 Grs Lactal",
      "marca": "Lactal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/870594/Pan-Blanco-Lactal-315-Gr-1-944095.jpg?v=638848210276600000",
      "fuente_url": "https://www.disco.com.ar/pan-blanco-315-grs-lactal/p"
    },
    {
      "nombre": "Pan Integral 420 Grs Bimbo",
      "marca": "Bimbo",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/870657/Pan-Integral-X-420-Gr-Bimbo-1-1030700.jpg?v=638848210517300000",
      "fuente_url": "https://www.disco.com.ar/pan-integral-420-grs-bimbo/p"
    },
    {
      "nombre": "Pan Salvado 330 Grs Lactal",
      "marca": "Lactal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/870593/Pan-Salvado-Lactal-330-Gr-1-944091.jpg?v=638848210272570000",
      "fuente_url": "https://www.disco.com.ar/pan-salvado-330-grs-lactal/p"
    }
  ],
  "Panificados › Panes para Panchos": [
    {
      "nombre": "Pan de Pancho Lactal 210 Grs x 6 Un",
      "marca": "Lactal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/870591/Pan-De-Pancho-Lactal-210-Gr-1-944087.jpg?v=638848210265200000",
      "fuente_url": "https://www.disco.com.ar/pan-de-pancho-6-un-210-grs-lactal/p"
    }
  ],
  "Panificados › Tostadas": [
    {
      "nombre": "Tostadas de Arroz Clásicas 100 Grs Riera",
      "marca": "Riera",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/884093/Crackers-De-Arroz-Cl-sicas-X-100-Grs-Riera-1-1048420.jpg?v=638939037733300000",
      "fuente_url": "https://www.disco.com.ar/crackers-de-arroz-clasicas-x-100-grs-riera/p"
    },
    {
      "nombre": "Tostadas Integrales Libres 200 Gr Riera",
      "marca": "Riera",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/902655/7790071070318.jpg?v=639102269112870000",
      "fuente_url": "https://www.disco.com.ar/tostadas-integrales-libres-200-gr-riera/p"
    },
    {
      "nombre": "Tostadas Sin Sal Libres 200 Gr Riera",
      "marca": "Riera",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/803356/Tostadas-Sin-Sal-Libres-Riera-18-X-200g-1-1000074.jpg?v=638379382978900000",
      "fuente_url": "https://www.disco.com.ar/tostadas-sin-sal-libres-200-gr-riera/p"
    }
  ],
  "Papelera › Papel Higiénico": [
    {
      "nombre": "Papel Higiénico Doble Hoja 30 Mts x 4 Un Higienol",
      "marca": "Higienol",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/844219/Papel-Higi-nico-Higienol-Balance-Doble-Hoja-30-M-X-4-U-1-1008467.jpg?v=638660829830330000",
      "fuente_url": "https://www.disco.com.ar/papel-higienico-premium-doble-hoja-30-m-x-4-un-higienol/p"
    },
    {
      "nombre": "Papel Higiénico Doble Hoja 50 Mts x 4 Un Higienol",
      "marca": "Higienol",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/900869/Papel-Higienico-Doble-Hoja-Yapa-4X50M-Higienol-Papel-Higienico-Higienol-Doble-Hoja-Yapa-4x50m-1-1055037.jpg?v=639082354097270000",
      "fuente_url": "https://www.disco.com.ar/papel-higienico-doble-hoja-yapa-4x50m-higienol/p"
    },
    {
      "nombre": "Papel Higienico Felpita Doble Hoja 4x20",
      "marca": "Felpita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/855021/Papel-Higienico-Felpita-Doble-Hoja-4x20-1-762189.jpg?v=638745502487230000",
      "fuente_url": "https://www.disco.com.ar/papel-higienico-felpita-doble-hoja-4x20/p"
    },
    {
      "nombre": "Papel Higiénico Plus Doble Hoja 30 Mts x 4 Un Higienol",
      "marca": "Higienol",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/844220/Papel-Higi-nico-Higienol-Plus-Fusi-n-Doble-Hoja-30-M-X-4-U-1-1008469.jpg?v=638660829834070000",
      "fuente_url": "https://www.disco.com.ar/papel-higienico-plus-fusion-doble-hoja-30-m-x-4-un-higienol/p"
    }
  ],
  "Papelera › Rollos de Cocina": [
    {
      "nombre": "Rollo de Cocina Doble Hoja 150 Un x 3 Un Sussex",
      "marca": "Sussex",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/784233/Rollo-De-Cocina-Sussex-Cl-sico-M-s-Blanco-50-Pa-os-X3-1-957263.jpg?v=638218353841100000",
      "fuente_url": "https://www.disco.com.ar/rollo-cocina-clasico-50-panos-3-un-sussex/p"
    },
    {
      "nombre": "Rollo de Cocina Doble Hoja x 3 Un Elite",
      "marca": "Elite",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/914562/77902500220531.jpg?v=639141259290000000",
      "fuente_url": "https://www.disco.com.ar/rollo-de-cocina-ultra-absorbente-60-panos-3-un-elite/p"
    },
    {
      "nombre": "Rollo de Cocina Ultra Doble Hoja 300 Paños x 3 Un Sussex",
      "marca": "Sussex",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/786893/Rollo-De-Cocina-Sussex-Premium-Maxirollo-100-Pa-os-3-U-1-29737.jpg?v=638239953923400000",
      "fuente_url": "https://www.disco.com.ar/rollo-de-cocina-ultra-100-panos-3-un-sussex/p"
    }
  ],
  "Papelera › Servilletas": [
    {
      "nombre": "Servilleta Sussex Premium - 150 U",
      "marca": "Sussex",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/481996/Servilletas-Descartables-Sussex-Premium-150-U-1-6923.jpg?v=636719754253070000",
      "fuente_url": "https://www.disco.com.ar/servilleta-sussex-premium-150-u/p"
    },
    {
      "nombre": "Servilletas de Papel Doble Hoja 33x33 Cm x 35 Un Elite",
      "marca": "Elite",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/707992/Servilletas-Descartables-Elite-Gold-33x33-Cm-35-U-1-14791.jpg?v=637919625956170000",
      "fuente_url": "https://www.disco.com.ar/servilletas-descartables-elite-navidenas-35-u/p"
    },
    {
      "nombre": "Servilletas Papel Hoja Simple 30x30 Cm x 80 Un Sussex",
      "marca": "Sussex",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/844198/Servilleta-Sussex-Cl-sica-Hoja-Simple-80-U-1-941890.jpg?v=638660829738200000",
      "fuente_url": "https://www.disco.com.ar/servilleta-clasica-hoja-simple-80-un-sussex/p"
    },
    {
      "nombre": "Servilletas Ultra Suave Hoja Simple 30x30 Cm x 100 Un Elite",
      "marca": "Elite",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/792043/Servilleta-Elite-Ultra-Suave-Hs-100u-1-986313.jpg?v=638294385817530000",
      "fuente_url": "https://www.disco.com.ar/servilleta-ultra-suave-hoja-simple-100-un-elite/p"
    }
  ],
  "Pastas Frescas y Tapas › Tapas de Empanadas": [
    {
      "nombre": "Tapas Empanadas Balance x 12 Un 330 Grs La Salteña",
      "marca": "La Salteña",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/923615/7790070621962.jpg?v=639219715436970000",
      "fuente_url": "https://www.disco.com.ar/tapas-para-empanadas-balance-croc-la-saltena-3/p"
    },
    {
      "nombre": "Tapas Empanadas Criollas x 22 Un La Salteña",
      "marca": "La Salteña",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/771536/Tapas-Empanadas-Criollas-La-Salte-a-X-22-U-1-471296.jpg?v=638132062304330000",
      "fuente_url": "https://www.disco.com.ar/tapas-empanadas-criollas-la-saltena-x-22-u/p"
    },
    {
      "nombre": "Tapas Empanadas Sabor Hojaldre x 12 Un 330 Grs Oralí",
      "marca": "Orali",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/772801/Tapas-Para-Empanadas-Orali-Hojaldre-12u-330g-1-946935.jpg?v=638138110540630000",
      "fuente_url": "https://www.disco.com.ar/tapas-para-empanadas-orali-hojaldre-12u-330g/p"
    },
    {
      "nombre": "Tapas Empanadas Sabor Hojaldre x 22 Un Familiar La Salteña",
      "marca": "La Salteña",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/771537/Tapas-Empanadas-Hojaldre-La-Salte-a-X-22u-1-471306.jpg?v=638132062308100000",
      "fuente_url": "https://www.disco.com.ar/tapas-empanadas-hojaldre-la-saltena-x-22u/p"
    }
  ],
  "Perfumería › Acondicionador": [
    {
      "nombre": "Acondicionador 3 Minute Miracle Hidratación Extrema 170 Ml Pantene",
      "marca": "Pantene",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/602040/Acondicionador-Diario-Pantene-Pro-v-3-Minute-Miracle-Hidrataci-n-Extrema-170-Ml-1-23331.jpg?v=637353042721900000",
      "fuente_url": "https://www.disco.com.ar/acondicionador-diario-pro-v-hidratacion-extrema-170-ml-pantene/p"
    },
    {
      "nombre": "Acondicionador Dove Hidratacion 400 Ml",
      "marca": "Dove",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930149/Acondicionador-Dove-Hidratacion-400-Ml-1-998743.jpg?v=639252781662300000",
      "fuente_url": "https://www.disco.com.ar/acondicionador-dove-hidratacion-400-ml/p"
    },
    {
      "nombre": "Acondicionador Mega Crecimiento 650ml Sedal",
      "marca": "Sedal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/921514/Acondicionador-Sedal-Mega-Crecimiento-650ml-2-1060194.jpg?v=639195753987800000",
      "fuente_url": "https://www.disco.com.ar/acondicionador-mega-crecimiento-650ml-sedal/p"
    },
    {
      "nombre": "Acondicionador Restauración 970 Ml Plusbelle",
      "marca": "Plusbelle",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/892918/Acondicionador-Esencia-Restauracion-970-Ml-Plusbelle-1-971540.jpg?v=639003731492170000",
      "fuente_url": "https://www.disco.com.ar/acondicionador-esencia-restauracion-970-ml-plusbelle/p"
    }
  ],
  "Perfumería › Desodorantes": [
    {
      "nombre": "Desodorante Antitranspirante Femenino Clinical X 58 Gr Dove",
      "marca": "Dove",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/855415/Desodorante-Antitranspirante-Femenino-Clinical-X-58-Gr-Dove-1-948421.jpg?v=638749822169500000",
      "fuente_url": "https://www.disco.com.ar/desodorante-antitranspirante-femenino-clinical-x-58-gr-dove/p"
    },
    {
      "nombre": "Desodorante Antitranspirante Invisible 150 Ml Rexona",
      "marca": "Rexona",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930095/Desodorante-Antitranspirante-Rexona-Invisible-En-Aerosol-150-Ml-1-36905.jpg?v=639252781348900000",
      "fuente_url": "https://www.disco.com.ar/desodorante-antitranspirante-rexona-invisible-en-aerosol-150-ml/p"
    },
    {
      "nombre": "Desodorante Antitranspirante Rexona Active Emotion En Aerosol 150ml",
      "marca": "Rexona",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930096/Desodorante-Antitranspirante-Rexona-Active-Emotion-En-Aerosol-150ml-1-36948.jpg?v=639252781355470000",
      "fuente_url": "https://www.disco.com.ar/desodorante-antitranspirante-rexona-active-emotion-en-aerosol-150ml/p"
    },
    {
      "nombre": "Desodorante Rexona Clinical Extra Dry 48gr",
      "marca": "Rexona",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/766319/Desodorante-Antitranspirante-Rexona-Clinical-Extra-Dry-En-Barra-48-G-1-5558.jpg?v=638103658024870000",
      "fuente_url": "https://www.disco.com.ar/desodorante-rexona-clinical-extra-dry-48gr/p"
    }
  ],
  "Perfumería › Jabones": [
    {
      "nombre": "Jabón de Tocador Aloe 85 Grs Protex",
      "marca": "Protex",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/923246/7509546705767_01.jpg?v=639215582670930000",
      "fuente_url": "https://www.disco.com.ar/jabon-de-tocador-aloe-x-85-grs-protex/p"
    },
    {
      "nombre": "Jabón de Tocador Antibacterial 90 Grs Dove",
      "marca": "Dove",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930103/Jabon-De-Tocador-Cuidado-Antibacterial-90-Grs-Dove-1-854132.jpg?v=639252781386030000",
      "fuente_url": "https://www.disco.com.ar/jabon-de-tocador-dove-cuidado-antibacterial-90-gr-3/p"
    },
    {
      "nombre": "Jabón de Tocador Original 90 Grs Dove",
      "marca": "Dove",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930203/Jabon-En-Barra-Original-Individual-90-Grs-Dove-1-1018546.jpg?v=639252781865930000",
      "fuente_url": "https://www.disco.com.ar/jabon-en-barra-original-individual-90-grs-dove/p"
    },
    {
      "nombre": "Jabón de Tocador Original 90 Grs x 3 Un Dove",
      "marca": "Dove",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930098/Jab-n-De-Tocador-Original-Multipack-90-Grs-X-3-Un-Dove-1-39507.jpg?v=639252781365630000",
      "fuente_url": "https://www.disco.com.ar/jabon-de-tocador-original-multipack-90-grs-x-3-un-dove/p"
    }
  ],
  "Perfumería › Shampoo": [
    {
      "nombre": "Shampoo Dove Hidratacion X400ml",
      "marca": "Dove",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930150/Shampoo-Dove-Hidratacion-X400ml-1-998746.jpg?v=639252781665270000",
      "fuente_url": "https://www.disco.com.ar/shampoo-dove-hidratacion-x400ml/p"
    },
    {
      "nombre": "Shampoo Elvive Colorvive 400ml",
      "marca": "Elvive",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/789193/Shampoo-Elvive-Color-400ml-1-977789.jpg?v=638260690741200000",
      "fuente_url": "https://www.disco.com.ar/shampoo-elvive-colorvive-400ml/p"
    },
    {
      "nombre": "Shampoo Mega Crecimiento 190ml Sedal",
      "marca": "Sedal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/930261/Shampoo-Mega-Crecimiento-190ml-Sedal-1-1060192.jpg?v=639252782074000000",
      "fuente_url": "https://www.disco.com.ar/shampoo-mega-crecimiento-190ml-sedal/p"
    },
    {
      "nombre": "Shampoo Restauración 700 Ml Pantene",
      "marca": "Pantene",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/917140/Shampoo-Pantene-Restauracion-700ml-1-1058401.jpg?v=639160222336870000",
      "fuente_url": "https://www.disco.com.ar/shampoo-pantene-restauracion-700ml/p"
    }
  ],
  "Repostería › Gelatinas en Polvo": [
    {
      "nombre": "Gelatina Frambuesa X 25 Grs Exquisita",
      "marca": "Exquisita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/878846/Gelatina-Frambuesa-X-25-Grs-Exquisita-1-1042368.jpg?v=638895837746530000",
      "fuente_url": "https://www.disco.com.ar/gelatina-frambuesa-x-25-grs-exquisita/p"
    },
    {
      "nombre": "Gelatina Frutilla Royal 25 G",
      "marca": "Royal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/885438/Gelatina-Frutilla-Royal-25-G-1-1049185.jpg?v=638948740081100000",
      "fuente_url": "https://www.disco.com.ar/gelatina-frutilla-royal-25-g-2/p"
    },
    {
      "nombre": "Gelatina Frutos Rojos Royal 25g",
      "marca": "Royal",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/885437/Gelatina-Frutos-Rojos-Royal-25g-1-1049184.jpg?v=638948740073770000",
      "fuente_url": "https://www.disco.com.ar/gelatina-frutos-rojos-royal-25g-2/p"
    }
  ],
  "Repostería › Premezclas Dulces": [
    {
      "nombre": "Bizcochuelo Familiar Sabor Coco 540 Grs Exquisita",
      "marca": "Exquisita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/923602/7790070433008.jpg?v=639219713173770000",
      "fuente_url": "https://www.disco.com.ar/bizcochuelo-coco-exquisita-x-540-gr/p"
    },
    {
      "nombre": "Bizcochuelo Polvo Sabor Chocolate 540 Grs Exquisita",
      "marca": "Exquisita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/806843/Bizcochuelo-Exquisita-Chocolate-X540g-1-1001170.jpg?v=638404221697600000",
      "fuente_url": "https://www.disco.com.ar/bizcochuelo-chocolate-exquisita-x-540-gr/p"
    },
    {
      "nombre": "Bizcochuelo Vainilla Exquisita X 540 Gr",
      "marca": "Exquisita",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/923601/7790070432964.jpg?v=639219713009700000",
      "fuente_url": "https://www.disco.com.ar/bizcochuelo-vainilla-exquisita-x-540-gr/p"
    }
  ],
  "Snacks › Maní": [
    {
      "nombre": "Mani Mani King Asado 80 Gr",
      "marca": "Maní King",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/922121/Mani-Mani-King-Asado-80-Gr-1-1060898.jpg?v=639198346149370000",
      "fuente_url": "https://www.disco.com.ar/mani-mani-king-asado-80-gr/p"
    },
    {
      "nombre": "Maní Tostado Sin Sal  Mani King 100 Gr",
      "marca": "Maní King",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/788473/Man-Mani-King-Tostado-Sin-Sal-X-100g-1-976834.jpg?v=638253789976300000",
      "fuente_url": "https://www.disco.com.ar/mani-tostado-sin-sal-mani-king-100-gr/p"
    }
  ],
  "Snacks › Papas Fritas": [
    {
      "nombre": "Papas Fritas Acanaladas 90 Grs Pehuamar",
      "marca": "Pehuamar",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/882733/Papas-Acanaladas-90G-Pehuamar-Papas-Pehuamar-Acanaladas-90g-1-1046714.jpg?v=638925105861500000",
      "fuente_url": "https://www.disco.com.ar/papas-fritas-pehuamar-acanaladas-90-g/p"
    },
    {
      "nombre": "Papas Fritas Clásicas 330 Grs Lay's",
      "marca": "Lay's",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/826846/Papas-fritas-Lays-Cl-sicas-x-330-Gr-Papas-Fritas-Lays-Cl-sicas-X-330-Gr-1-972389.jpg?v=638556933874400000",
      "fuente_url": "https://www.disco.com.ar/papas-fritas-lays-clasicas-330-g/p"
    },
    {
      "nombre": "Papas Fritas Lays Clásicas 40 G",
      "marca": "Lay's",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/826817/Papas-Fritas-Lays-Cl-sicas-X-40-Gr-1-971799.jpg?v=638556933777600000",
      "fuente_url": "https://www.disco.com.ar/papas-fritas-lays-clasicas-40-g/p"
    },
    {
      "nombre": "Papas Fritas Lays Clásicas 85 G",
      "marca": "Lay's",
      "imagen_url": "https://jumboargentina.vteximg.com.br/arquivos/ids/912523/7790310985458.jpg?v=639136009138730000",
      "fuente_url": "https://www.disco.com.ar/papas-fritas-lays-clasicas-85-g/p"
    }
  ]
};

/** Arranque con cero artículos (incluidas bajas), o completado explícito. */
export async function seed_productos_distribuidora({ completar = false, transaction } = {}) {
  if (!projectModules.eccomerce_distribuidora) return;
  // Importar la lista para validarla no carga el .env ni abre una conexión.
  const { sequelize } = await import("../sequelize.js");
  const modelos = await import("../../models/index.js");
  const { resolverMarcaDeArticulo } = await import("../../services/distribuidora/marcas_distribuidora_service.js");
  const ejecutar = async (tx) => {
    // Mismo bloqueo que el comando manual, también durante el primer arranque.
    await sequelize.query("SELECT pg_advisory_xact_lock(741923, 1)", { transaction: tx });
    if (!completar && await modelos.ProductoDistribuidora.count({ transaction: tx })) return;
    return completarProductos(modelos, PRODUCTOS_INICIALES, tx, resolverMarcaDeArticulo);
  };
  const resultado = transaction ? await ejecutar(transaction) : await sequelize.transaction(ejecutar);
  if (!resultado) return;
  for (const omitido of resultado.omitidos) {
    console.warn(`⚠️ Producto omitido: ${omitido.ruta} / ${omitido.nombre}: ${omitido.motivo}`);
  }
  console.log(`✅ Productos: ${resultado.productos} agregados como inactivos; ${resultado.existentes} existentes conservados`);
  return resultado;
}
