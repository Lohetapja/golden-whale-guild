import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works on GitHub Pages under /golden-whale-guild/
  base: './',
  server: {
    port: 5173,
  },
});
