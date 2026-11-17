import { useId } from "react";

const BASE = "min-h-11 mt-1 rounded-xl border px-3 py-2 outline-none transition duration-200";
const STATE = {
  enabled:  "border-gray-300 bg-white text-gray-900 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25",
  disabled: "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400",
  error:    "border-red-400 bg-red-50 text-gray-900 focus:border-red-400 focus:ring-2 focus:ring-red-200",
};

export default function SelectField({
  label,
  name,
  register,
  error,
  options = [],
  placeholder = "Seleccionar...",
  fijoValue,
  disabled = false,
  disabledVisual = false,
  hidden = false,
  asNumber = false,
  className = "",
  wrapperClassName = "",
  labelClassName = "",
  errorClassName = "",
  value,
  onChange,
  id,
  showLabel = true,
  helperText,
  fullWidth = true,
  showPlaceholderOption = true,
  ...rest
}) {
  const generatedId = useId();
  if (hidden) return null;

  const selectId = id || name || generatedId;
  const isDisabled = disabled || disabledVisual;

  const registerOptions = asNumber
    ? {
        setValueAs: (v) => {
          if (v === "" || v === null || v === undefined) return undefined;
          const n = Number(v);
          return Number.isNaN(n) ? undefined : n;
        },
      }
    : { setValueAs: (v) => String(v ?? "").trim() };

  const stateClass = error ? STATE.error : isDisabled ? STATE.disabled : STATE.enabled;

  return (
    <div className={["group", wrapperClassName].join(" ")}>
      {label && showLabel && (
        <label
          htmlFor={selectId}
          className={["block text-sm font-semibold text-gray-700", labelClassName].join(" ")}
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        name={name}
        disabled={isDisabled}
        {...(register && name ? register(name, registerOptions) : {})}
        value={value}
        {...(onChange ? { onChange } : {})}
        aria-invalid={!!error}
        defaultValue={value === undefined ? (fijoValue ?? "") : undefined}
        className={[BASE, fullWidth ? "w-full" : "", stateClass, className].join(" ")}
        {...rest}
      >
        {showPlaceholderOption && (
          <option value="" className="bg-white text-gray-900">
            {placeholder}
          </option>
        )}
        {options.map((op) => (
          <option key={op.value} value={op.value} className="bg-white text-gray-900">
            {op.label}
          </option>
        ))}
      </select>

      {error ? (
        <p className={["mt-1 text-sm text-red-600", errorClassName].join(" ")}>{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
}
