import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

declare module '@remix-run/server-runtime' {
  interface Future {
    unstable_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        unstable_singleFetch: true,
      },
      serverModuleFormat: 'cjs',
      ignoredRouteFiles: ['"**/*.{css,js,png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot,json}"'],
    }),
    tsconfigPaths(),
  ],
});
