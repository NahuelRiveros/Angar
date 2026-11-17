export default function ActionButton({ children, className = "", ...props }) {
  return <button type="button" {...props} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-(--kt-teal-700) px-4 py-2.5 text-sm font-bold text-white transition hover:bg-(--kt-petrol) focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}
