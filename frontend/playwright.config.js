import process from "node:process";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser", timeout: 30000, fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:4178", trace: "retain-on-failure" },
  // Client ID falso: muestra el botón de Google; el script de Google se simula en cada prueba.
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 4178 --strictPort", url: "http://127.0.0.1:4178", reuseExistingServer: false, env: { ...process.env, VITE_GOOGLE_CLIENT_ID: "cliente-de-prueba" } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "small-mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true } },
  ],
});
