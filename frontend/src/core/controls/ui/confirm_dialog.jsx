import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";

const CONFIRM_BTN = {
  danger:  "border-red-500 bg-red-600 hover:bg-red-700 text-white",
  warning: "border-amber-500 bg-amber-600 hover:bg-amber-700 text-white",
  primary: "border-blue-500 bg-blue-600 hover:bg-blue-700 text-white",
};

const ICON_WRAP = {
  danger:  "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  primary: "border-blue-200 bg-blue-50",
};

const ICON_COLOR = {
  danger:  "text-red-600",
  warning: "text-amber-600",
  primary: "text-blue-600",
};

export default function ConfirmDialog({
  open,
  title = "¿Estás seguro?",
  message,
  onConfirm,
  onClose,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  icon: Icon,
}) {
  if (!open) return null;

  const DefaultIcon = variant === "danger" ? Trash2 : AlertTriangle;
  const ResolvedIcon = Icon ?? DefaultIcon;

  return (
    <div className="fixed inset-0 z-[var(--z-modal-nested)] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50"
        onClick={!loading ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative z-[var(--z-content)] w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border", ICON_WRAP[variant] ?? ICON_WRAP.danger)}>
          <ResolvedIcon className={cn("h-5 w-5", ICON_COLOR[variant] ?? ICON_COLOR.danger)} />
        </div>

        <div className="mt-4 text-center">
          <h3 id="confirm-title" className="text-base font-bold text-gray-900">{title}</h3>
          {message && <p className="mt-2 text-sm text-gray-500">{message}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn("flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:opacity-50", CONFIRM_BTN[variant] ?? CONFIRM_BTN.danger)}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
