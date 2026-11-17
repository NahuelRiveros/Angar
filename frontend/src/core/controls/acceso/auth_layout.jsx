import { Link } from "react-router-dom";
import LogoMoovs from "../brand/logo_moovs.jsx";
export default function AuthLayout({ title, subtitle, children }) {
  return <div className="bg-(--kt-bg-soft) px-4 py-10 sm:py-16"><section className="mx-auto w-full max-w-md rounded-3xl border border-(--kt-border) bg-white p-6 shadow-sm sm:p-8">
    <Link to="/" className="mb-6 inline-flex" aria-label="Volver al inicio"><LogoMoovs size="sm" /></Link>
    <h1 className="kt-display text-2xl font-bold">{title}</h1>
    <p className="mt-2 text-sm text-(--kt-ink-soft)">{subtitle}</p><div className="mt-6">{children}</div>
  </section></div>;
}
