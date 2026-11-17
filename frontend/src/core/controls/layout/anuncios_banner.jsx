import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useBannersVigentes } from "../../hooks/use_banners.js";

const ROTAR_MS = 5000;

/** Cinta superior del sitio (banners de tipo "cinta", SIS-32): va antes del navbar, en toda la app. */
export default function AnunciosBanner() {
  const { banners } = useBannersVigentes();
  const anuncios = banners.cinta;
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (anuncios.length < 2) return;
    const id = setInterval(() => setIndice((i) => (i + 1) % anuncios.length), ROTAR_MS);
    return () => clearInterval(id);
  }, [anuncios.length]);

  if (!anuncios.length) return null;
  const actual = anuncios[indice % anuncios.length];
  const texto = <span key={actual.id} className="kt-item-in truncate">{actual.titulo}</span>;

  return (
    <div role="status" className="flex min-h-9 items-center justify-center gap-2 bg-(--kt-night) px-3 py-2 text-center text-xs font-semibold text-white sm:text-sm">
      <Megaphone size={14} aria-hidden="true" className="shrink-0 text-(--kt-turquoise)" />
      {!actual.enlace ? texto
        : actual.enlace.startsWith("/") ? <Link to={actual.enlace} className="truncate underline-offset-2 hover:underline">{texto}</Link>
        : <a href={actual.enlace} target="_blank" rel="noopener noreferrer" className="truncate underline-offset-2 hover:underline">{texto}</a>}
    </div>
  );
}
