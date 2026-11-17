import { useId, useMemo, useState } from "react";
import { Eye, EyeOff, Info } from "lucide-react";

const PRESET_RULES = {
  numeric:      { pattern: { value: /^[0-9]+$/, message: "Solo se permiten números" } },
  alpha:        { pattern: { value: /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, message: "Solo se permiten letras" } },
  alphanumeric: { pattern: { value: /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]+$/, message: "Solo se permiten letras y números" } },
  phone:        { pattern: { value: /^[0-9+\-\s()]+$/, message: "Ingresá un teléfono válido" } },
  dni:          { pattern: { value: /^[0-9]{6,12}$/, message: "El documento debe tener entre 6 y 12 números" } },
  username:     { pattern: { value: /^[A-Za-z0-9._-]+$/, message: "Solo se permiten letras, números, punto, guion y guion bajo" } },
};

function buildRules({ type, required, requiredMessage, minLength, maxLength, pattern, validate, watch, matchField, matchFieldMessage }) {
  const rules = {};
  if (required) rules.required = requiredMessage ?? "Este campo es obligatorio";
  if (type === "email") rules.pattern = { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Ingresá un email válido" };
  if (type === "password") {
    rules.minLength = { value: minLength ?? 6, message: `La contraseña debe tener al menos ${minLength ?? 6} caracteres` };
  } else if (minLength) {
    rules.minLength = { value: minLength, message: `Debe tener al menos ${minLength} caracteres` };
  }
  if (maxLength) rules.maxLength = { value: maxLength, message: `Debe tener como máximo ${maxLength} caracteres` };
  if (pattern) rules.pattern = pattern;
  if (matchField && watch) rules.validate = (value) => value === watch(matchField) || (matchFieldMessage ?? "Los campos no coinciden");
  if (validate) rules.validate = validate;
  return rules;
}

const BASE = "w-full rounded-xl border px-3 py-2 outline-none transition duration-200 placeholder:text-gray-400";
const STATE = {
  enabled:  "border-gray-300 bg-white text-gray-900 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25",
  readOnly: "border-gray-200 bg-gray-50 text-gray-700 cursor-default",
  disabled: "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400",
  error:    "border-red-400 bg-red-50 text-gray-900 focus:border-red-400 focus:ring-2 focus:ring-red-200",
  warning:  "border-amber-400 bg-amber-50 text-gray-900 focus:ring-2 focus:ring-amber-200",
  success:  "border-emerald-400 bg-emerald-50 text-gray-900 focus:ring-2 focus:ring-emerald-200",
};

export default function InputField({
  label,
  name,
  id,
  register,
  rules,
  error,
  warning,
  success,
  helperText,
  tooltip,
  type = "text",
  placeholder = "",
  value,
  onChange,
  onBlur,
  onKeyDown,
  autoComplete,
  autoCompleteEnabled = true,
  inputMode,
  min,
  max,
  step,
  minLength,
  maxLength,
  required = false,
  requiredMessage,
  disabled = false,
  readOnly = false,
  hidden = false,
  disabledVisual = false,
  icon: Icon,
  rightIcon: RightIcon,
  showPasswordToggle = false,
  fullWidth = true,
  hideLabel = false,
  hideMessage = false,
  className = "",
  wrapperClassName = "",
  labelClassName = "",
  pattern,
  validate,
  validationPreset,
  watch,
  matchField,
  matchFieldMessage = "Los campos no coinciden",
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();

  const validationRules = useMemo(() => ({
    ...buildRules({ type, required, requiredMessage, minLength, maxLength, pattern, validate, watch, matchField, matchFieldMessage }),
    ...(validationPreset ? PRESET_RULES[validationPreset] ?? {} : {}),
    ...(rules ?? {}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [type, required, requiredMessage, minLength, maxLength, pattern, validate, validationPreset, rules]);

  if (hidden) return null;

  const inputId = id ?? name ?? generatedId;
  const isPassword = type === "password";
  const finalType = isPassword && showPassword ? "text" : type;
  const isControlled = value !== undefined || onChange !== undefined;
  const isDisabled = disabled || disabledVisual;

  const registeredProps = !isControlled && register && name ? register(name, validationRules) : {};

  const stateClass = error ? STATE.error
    : warning ? STATE.warning
    : success ? STATE.success
    : isDisabled ? STATE.disabled
    : readOnly ? STATE.readOnly
    : STATE.enabled;

  const message = error ?? warning ?? success ?? helperText;
  const messageClass = error ? "mt-1 text-sm text-red-600"
    : warning ? "mt-1 text-sm text-amber-600"
    : success ? "mt-1 text-sm text-emerald-600"
    : "mt-1 text-sm text-gray-500";

  const resolvedAutoComplete = (() => {
    if (autoComplete) return autoComplete;
    if (!autoCompleteEnabled) return "off";
    if (type === "password") return "new-password";
    if (type === "email") return "email";
    return "on";
  })();

  return (
    <div className={["group", fullWidth ? "w-full" : "", wrapperClassName].join(" ")}>
      {label && !hideLabel && (
        <label
          htmlFor={inputId}
          className={["flex items-center gap-1 text-sm font-semibold text-gray-700", labelClassName].join(" ")}
        >
          {label}
          {required && <span aria-hidden="true" className="text-red-500">*</span>}
          {tooltip && (
            <span className="group/tooltip relative inline-flex">
              <Info className="h-3.5 w-3.5 cursor-help text-gray-400 hover:text-gray-600" />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-max max-w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
              >
                {tooltip}
              </span>
            </span>
          )}
        </label>
      )}

      <div className="relative mt-1 flex items-center">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />
        )}

        <input
          id={inputId}
          name={name}
          type={finalType}
          placeholder={placeholder}
          autoComplete={resolvedAutoComplete}
          inputMode={inputMode}
          min={min}
          max={max}
          step={step}
          minLength={minLength}
          maxLength={maxLength}
          disabled={isDisabled}
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={message ? `${inputId}-message` : undefined}
          className={[
            BASE,
            Icon ? "pl-9" : "",
            RightIcon || showPasswordToggle ? "pr-9" : "",
            stateClass,
            className,
          ].join(" ")}
          {...registeredProps}
          {...(isControlled ? { value, onChange } : {})}
          onBlur={(e) => { registeredProps?.onBlur?.(e); onBlur?.(e); }}
          onKeyDown={onKeyDown}
          {...rest}
        />

        {RightIcon && !showPasswordToggle && (
          <RightIcon className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400" />
        )}

        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition hover:text-gray-700 focus-visible:outline-2"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!hideMessage && message && (
        <p id={`${inputId}-message`} className={messageClass}>
          {message}
        </p>
      )}
    </div>
  );
}
