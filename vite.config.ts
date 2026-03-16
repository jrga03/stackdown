import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { comlink } from 'vite-plugin-comlink';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    comlink(),
    tailwindcss(),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  worker: {
    plugins: () => [comlink()],
  },
});
