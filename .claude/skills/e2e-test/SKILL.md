---
name: e2e-test
description: Crea o modifica pruebas Playwright de los flujos de DistribuCG, con API simulada y cobertura de escritorio y móviles.
---

# Pruebas de navegador

Leer frontend/playwright.config.js y frontend/tests/browser/storefront.spec.js.
Archivos en frontend/tests/browser/<flujo>.spec.js. Playwright inicia Vite en 127.0.0.1:4178;
no iniciar servidor/src/server.js ni conectar la base para esta suite.

Simular explícitamente las APIs del flujo con page.route antes de navegar, incluyendo auth,
módulos, errores y respuestas de catálogo. Evitar tráfico a servicios reales.
Usar getByRole/getByLabel y expect con espera automática, sin pausas arbitrarias.
Verificar el efecto observable: persistencia en navegación, cantidades, envío único,
saldo/estado mostrado o recuperación de un error. No limitarse a que exista un botón.

Ejecutar los proyectos desktop, mobile y small-mobile cuando afecte navegación o layout;
comprobar foco, teclado y desbordamiento. Datos sintéticos, sin credenciales reales.
Desde la raíz: npm --prefix frontend run test:e2e -- tests/browser/<flujo>.spec.js.
Si falta Chromium, instalarlo desde frontend con npx playwright install chromium
dentro de los permisos disponibles. Informar fallos o dependencias faltantes.

La API simulada no prueba transacciones, autorización real o almacenamiento PostgreSQL.
Si esas reglas cambiaron, complementar con la integración local del servidor.
