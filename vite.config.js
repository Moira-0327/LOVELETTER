import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  root: '.',
  base: '/lover-letter/',
  plugins: [basicSsl()],
  server: {
    host: true,
    https: true,
  },
  build: {
    outDir: 'docs',
  },
});
