// Lint del servidor (lo corre scripts/verificar.mjs con el ESLint que ya instala el frontend). Sin plugins:
// solo lo que más bugs evita en JavaScript sin tipos: variables sin usar y nombres sin definir.
const NODE = ["process", "console", "Buffer", "URL", "URLSearchParams", "TextEncoder", "TextDecoder", "AbortController", "AbortSignal",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "clearImmediate", "queueMicrotask", "structuredClone",
  "fetch", "Request", "Response", "Headers", "FormData", "Blob", "crypto", "performance", "globalThis"];

export default [
  { ignores: ["node_modules/**", "uploads/**", "dist/**"] },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: Object.fromEntries(NODE.map((n) => [n, "readonly"])) },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-undef": "error",
    },
  },
];
