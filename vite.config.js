import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/nombre-del-repo/" : "/",
  // lo que ya tenías
  plugins: [react()],
}));