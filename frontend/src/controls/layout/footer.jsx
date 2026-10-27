import { Link } from "react-router-dom";
import { HelpCircle, Phone } from "lucide-react";
import { footer_config } from "../../config/footer_config.js";
import { iconoHome } from "../config/home_iconos.js";
import { useHomeConfig } from "../../hooks/use_home_config.js";
import { HOME_CONTACTOS } from "../../config/home_config.js";
import { brandConfig } from "../../config/brand_config.js";
import LogoMarca from "../brand/logo_marca.jsx";

// Un placeholder sin completar en home_config.js se ve como "[Tu número acá]"
// — mostrarlo tal cual a un cliente real sería peor que no mostrar nada.
const esPlaceholder = (v) => /^\[.*\]$/.test(String(v ?? "").trim());

export default function Footer() {
  const { diferenciales, callout, legal } = footer_config;
  const { contactos } = useHomeConfig();
  const diferencialesActivos = diferenciales.filter((item) => item.habilitado);

  const contactosReales = (contactos.length > 0 ? contactos : HOME_CONTACTOS)
    .filter((c) => !esPlaceholder(c.valor));

  return (
    <footer className="kt-body relative overflow-hidden bg-(--kt-night) text-white">
      {/* Marca de agua sutil del isotipo, en vez de la grilla técnica de antes —
          da profundidad sin competir con el texto. */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--kt-turquoise) 0%, transparent 70%)" }}
      />

      {/* ── Línea superior — acento de marca, estática (la versión animada
          competía visualmente con el contenido de abajo) ── */}
      <div className="h-0.75 bg-linear-to-r from-(--kt-petrol) via-(--kt-turquoise) to-(--kt-petrol)" />

      {/* ── Columnas ── */}
      <div className="relative mx-auto w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-x-10 gap-y-12 py-14 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">

          {/* ── Marca ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div>
                <LogoMarca size="sm" variant="light" />
                <p className="mt-1 text-xs text-slate-400">{brandConfig.rubro}</p>
              </div>
            </div>
            <p className="max-w-70 text-sm leading-6 text-slate-300">
              {brandConfig.tagline}
            </p>
          </div>

          {/* ── Ayuda / Contacto — datos reales (home_config.js), nunca inventados ── */}
          <div>
            <FooterColumn label="Ayuda">
              <FooterLink to="/#como-funciona" icon={HelpCircle}>Cómo funciona</FooterLink>
              {contactosReales.length > 0 && <FooterLink to="/#contacto" icon={Phone}>Contacto</FooterLink>}
            </FooterColumn>


            {contactosReales.length > 0 && (
              <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
                {contactosReales.map(({ id, icono, valor, href }) => {
                  const Icon = iconoHome(icono);
                  const contenido = (
                    <>
                      <Icon size={14} className="shrink-0 text-(--kt-accent-on-dark)" />
                      <span className="text-xs leading-5 text-slate-300">{valor}</span>
                    </>
                  );
                  return (
                    <li key={id} className="flex items-center gap-2">
                      {href && href !== "#" ? (
                        <a href={href} className="flex items-center gap-2 hover:text-white">{contenido}</a>
                      ) : contenido}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Motivación ── */}
          {diferencialesActivos.length > 0 && (
            <div>
              <FooterColumn label="¿Por qué elegirnos?">
                {diferencialesActivos.map((item) => (
                  <li key={item.titulo} className="flex items-start gap-2.5">
                    <item.icon size={15} className="mt-0.5 shrink-0 text-(--kt-accent-on-dark)" />
                    <div>
                      <div className="text-sm font-semibold text-white">{item.titulo}</div>
                      <div className="text-xs leading-5 text-slate-400">{item.texto}</div>
                    </div>
                  </li>
                ))}
              </FooterColumn>

              {callout && (
                <div className="mt-5 rounded-2xl border border-(--kt-turquoise)/20 bg-(--kt-turquoise)/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-(--kt-accent-on-dark)">{callout.titulo}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-200">{callout.texto}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Barra inferior ── */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 py-5 sm:flex-row sm:justify-between">
          <p className="text-xs tracking-wide text-slate-300">
            © {new Date().getFullYear()} · <span className="font-semibold text-white">{legal.nombreDerechos}</span> · Todos los derechos reservados.
          </p>
          {legal.mostrarDesarrolladoPor && (
            <p className="text-[11px] tracking-wide text-slate-400">
              Sistema de gestión · {legal.desarrolladoPor}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ label, children }) {
  return (
    <div>
      <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white">{label}</h4>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

const FOOTER_LINK_CLASS = "flex items-center gap-2.5 text-sm text-slate-300 transition-colors hover:text-white";

function FooterLink({ to, icon, children }) {
  const Icon = icon;
  return (
    <li>
      <Link to={to} className={FOOTER_LINK_CLASS}>
        <Icon size={15} className="shrink-0 text-(--kt-accent-on-dark)" />
        {children}
      </Link>
    </li>
  );
}
