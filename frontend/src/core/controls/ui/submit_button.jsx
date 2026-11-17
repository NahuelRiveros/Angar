export default function SubmitButton({
  label,
  children,
  loading = false,
  loadingLabel = "Procesando...",
  disabled = false,
  type = "submit",
  onClick,
  className = "",
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold",
        "border border-white/10 bg-blue-500 text-white",
        "hover:bg-blue-800 active:scale-[0.99] transition",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600",
        className,
      ].join(" ")}
    >
      {loading ? (
        loadingLabel
      ) : children ? (
        children
      ) : (
        label
      )}
    </button>
  );
}