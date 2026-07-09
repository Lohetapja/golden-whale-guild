import { defineConfig } from 'vite';

export default defineConfig({
  base: '/golden-whale-guild/',
  server: {
    // PORT lets preview/CI harnesses assign a free port; 5173 stays the default
    port: Number(process.env.PORT) || 5173,
  },
});
