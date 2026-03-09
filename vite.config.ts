import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { comlink } from 'vite-plugin-comlink';

export default defineConfig({
  plugins: [
    comlink(),
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
