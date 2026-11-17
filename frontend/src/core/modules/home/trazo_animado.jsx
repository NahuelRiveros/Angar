// Decoración compartida: SVG inline y animaciones CSS existentes, sin timers.
export default function TrazoAnimado({ ofertas = false }) {
  const curva = ofertas
    ? "M8 50 C58 50 62 18 112 18 S170 50 232 14"
    : "M8 42 C52 42 58 14 108 14 S172 50 232 26";
  const finY = ofertas ? 14 : 26;

  return (
    <svg
      viewBox="0 0 240 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none h-10 w-40 shrink-0 sm:h-14 sm:w-52 ${ofertas ? "text-(--kt-accent-comercial)" : "text-(--kt-turquoise)"}`}
    >
      <path d={curva} stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path
        d={curva}
        pathLength="240"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32 208"
        className="kt-flow-path [animation-duration:6s] motion-reduce:animate-none!"
        opacity="0.65"
      />
      <circle cx="8" cy={ofertas ? 50 : 42} r="3" fill="currentColor" opacity="0.4" />
      <circle
        cx="232" cy={finY} r="4" fill="currentColor"
        className="kt-pulse-dot origin-center [transform-box:fill-box] [animation-duration:3s] motion-reduce:animate-none!"
        opacity="0.65"
      />
    </svg>
  );
}
