# Login con Google en producción

Direcciones de esta instalación, compartidas por frontend y API mediante
`deployment_config.js`:

- Frontend: `https://mipadel.vercel.app`.
- API: `https://mipadel.onrender.com/api`.

## Variables de las plataformas

En Vercel, proyecto del frontend, Environment Variables para Production:

```dotenv
VITE_API_URL=https://mipadel.onrender.com/api
VITE_GOOGLE_CLIENT_ID=EL_CLIENT_ID_PUBLICO_DE_GOOGLE
```

En Render, servicio del backend, Environment:

```dotenv
CORS_ORIGIN=https://mipadel.vercel.app
VERCEL_FRONTEND_URL=https://mipadel.vercel.app
RENDER_APP_URL=https://mipadel.onrender.com
GOOGLE_CLIENT_ID=EL_MISMO_CLIENT_ID_PUBLICO_DE_VERCEL
# Correo (avisos de pedidos y recuperación de contraseña). Render gratis bloquea
# el SMTP: usar la API de Brevo. Ver servidor/.env.example.
CLAVE_API_BREVO=[COMPLETAR]
CORREO_REMITENTE=[COMPLETAR con el correo verificado en Brevo]
NOMBRE_REMITENTE=[COMPLETAR, ej. MiPadel]
```

No agregar `/api` al origen de CORS. Los dominios adicionales autorizados
se separan por comas. Una variable configurada en la plataforma tiene
prioridad sobre las direcciones de respaldo del repositorio: corregir
los valores antiguos en ambos paneles.

Después de actualizar las variables, generar un nuevo despliegue del
frontend y aplicar la configuración del backend. Vite incorpora `VITE_*`
al compilar, por lo que recargar el navegador no cambia un bundle viejo.
El build rechaza la URL del backend anterior para impedir que se envíen
credenciales a ese proyecto.

## Google Cloud

En el cliente OAuth de tipo aplicación web, incluir como origen JavaScript
autorizado `https://mipadel.vercel.app`. El código usa Google Identity
Services con callback de credencial, no un client secret en el navegador.
Los dos Client ID deben coincidir. Si se usa un cliente OAuth en modo
Testing, revisar también sus usuarios de prueba según la configuración
de Google Cloud.

Vercel envía `Cross-Origin-Opener-Policy: same-origin-allow-popups`; Express
usa la misma política cuando sirve el frontend localmente. Esto permite
la comunicación del popup. No reemplaza la autorización CORS de la API.

## Diagnóstico y comprobación

En el diagnóstico inicial, la web publicada solicitaba
`https://dynamic-gym.onrender.com/api/auth/google`. Esa URL provenía del
respaldo anterior del cliente HTTP o de una variable del build publicado.
Además, el backend correcto respondió 403 al preflight desde el dominio
de la tienda, confirmando un problema independiente de CORS.

Después de desplegar, comprobar en Network:

1. El destino es `https://mipadel.onrender.com/api/auth/google`.
2. `OPTIONS` responde 204 con
   `Access-Control-Allow-Origin: https://mipadel.vercel.app`.
3. Se envía el `POST` y se recibe su respuesta.

Un 403 de CORS ocurre antes de validar la credencial de Google. Si CORS
ya funciona y el POST devuelve un error de autenticación, revisar su
respuesta y los logs del backend para comprobar el Client ID y el token.

Fuentes:
[Google Identity Services: configuración de orígenes y COOP](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid),
[Vite: variables de entorno durante el build](https://vite.dev/guide/env-and-mode).
