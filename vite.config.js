import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/TrabajoCampo/" : "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/firestore", "firebase/analytics"],
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
}));