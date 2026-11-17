export function safeReturnTo(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "https://local.invalid");
    if (parsed.origin !== "https://local.invalid" || /^\/(login|register|forgot-password|reset-password)(\/|$)/.test(parsed.pathname)) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return fallback; }
}
export function authLink(path, returnTo) { return path + "?returnTo=" + encodeURIComponent(safeReturnTo(returnTo)); }
