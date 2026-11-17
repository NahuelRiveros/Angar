const BASE = "mt-1 w-full rounded-xl border px-3 py-2 outline-none transition duration-200 placeholder:text-gray-400 resize-none";
const STATE = {
  enabled:  "border-gray-300 bg-white text-gray-900 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25",
  disabled: "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400",
  readOnly: "border-gray-200 bg-gray-50 text-gray-700 cursor-default",
  error:    "border-red-400 bg-red-50 text-gray-900 focus:border-red-400 focus:ring-2 focus:ring-red-200",
};

export default function TextareaField({
  label,
  name,
  error,
  helperText,
  disabled = false,
  readOnly = false,
  rows = 3,
  placeholder = "",
  className = "",
  value,
  onChange,
  register,
}) {
  const stateClass = error ? STATE.error
    : disabled ? STATE.disabled
    : readOnly ? STATE.readOnly
    : STATE.enabled;

  const registeredProps = register && name ? register(name) : {};

  return (
    <div className="group">
      {label && (
        <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={[BASE, stateClass, className].join(" ")}
        {...registeredProps}
        {...(value !== undefined ? { value } : {})}
        {...(onChange ? { onChange } : {})}
      />

      {error ? (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
}
