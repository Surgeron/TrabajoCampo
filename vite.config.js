import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    delete process.env.VITE_API_URL
  }
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss()],
    base: '/TrabajoCampo/',
    define: env.VITE_API_URL
      ? { 'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL) }
      : undefined,
  }
})
