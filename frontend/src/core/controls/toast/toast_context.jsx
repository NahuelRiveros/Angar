import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./use_toast.js";

const STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error:   "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info:    "border-blue-200 bg-blue-50 text-blue-700",
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((type, message) => {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    setItems((current) => [...current, { id, type, message }]);
    setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      warning: (message) => push("warning", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-20 z-[var(--z-banner)] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              "rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg shadow-slate-900/10",
              STYLES[item.type] ?? STYLES.info,
            ].join(" ")}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
