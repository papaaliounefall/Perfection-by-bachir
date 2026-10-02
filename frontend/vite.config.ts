import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    build: {
      // top-level await (sélection mock/API au démarrage)
      target: 'es2022',
    },
    server: {
      // Même origine que le frontend : les cookies de session et CSRF fonctionnent sans CORS
      proxy: {
        '/api': env.BACKEND_URL || 'http://localhost:8000',
        '/admin': env.BACKEND_URL || 'http://localhost:8000',
        '/static': env.BACKEND_URL || 'http://localhost:8000',
      },
    },
  };
});
