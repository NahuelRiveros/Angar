import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolverApiUrl } from './src/api/api_url.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Fallar durante el build si Vercel conserva la URL del proyecto anterior.
  const variables = loadEnv(mode, import.meta.dirname, 'VITE_')
  resolverApiUrl(variables.VITE_API_URL, command === 'serve')
  return { plugins: [react(), tailwindcss()] }
})
