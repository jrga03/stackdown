import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { comlink } from 'vite-plugin-comlink';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [comlink(), tailwindcss(), react({
    babel: {
      plugins: ['babel-plugin-react-compiler'],
    },
  }), cloudflare()],
  worker: {
    plugins: () => [comlink()],
  },
});