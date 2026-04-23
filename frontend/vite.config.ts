import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  const apiBase = env.VITE_API_BASE || '/api'
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'
  const shouldProxy = apiBase.startsWith('/')

  return {
    plugins: [react()],
    server: {
      proxy: shouldProxy
        ? {
            [apiBase]: {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
  }
})
