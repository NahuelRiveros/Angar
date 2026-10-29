import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./navbar/navbar.jsx";
import Footer from "./footer.jsx";
import AnunciosBanner from "./anuncios_banner.jsx";
import SuscripcionBanner from "../suscripcion/suscripcion_banner.jsx";
import ErrorBoundary from "../ui/error_boundary.jsx";

function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
      return;
    }
    const saved = sessionStorage.getItem("scroll:" + key);
    window.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
    return () => sessionStorage.setItem("scroll:" + key, String(window.scrollY));
  }, [pathname, hash, key]);
  return null;
}

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <ScrollToTop />
      {/* Al imprimir (fixture, llave) solo sale el contenido. "contents" no arma caja: la barra sigue fija (sticky). */}
      <div className="contents print:hidden">
        <AnunciosBanner />
        <Navbar />
        <SuscripcionBanner />
      </div>
      <main id="main-content" tabIndex={-1}>
        <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
      </main>
      <div className="contents print:hidden"><Footer /></div>
    </div>
  );
}
