// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  site: 'http://localhost:4321',
  vite: {
    server: {
      allowedHosts: ['.cnb.run'],
    },
    resolve: {
      alias: {
        '@data': '/workspace/data',
      },
    },
  },
});
