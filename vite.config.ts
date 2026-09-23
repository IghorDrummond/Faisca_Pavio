import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ mode }) => {
  // __DEBUG__: ferramentas de debug. Ativo em dev e no build "e2e"; removido (tree-shaking) em produção.
  const debug = mode !== 'production';
  return {
    define: {
      __DEBUG__: JSON.stringify(debug),
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    build: {
      target: 'es2022',
      outDir: mode === 'e2e' ? 'dist-e2e' : 'dist',
      emptyOutDir: true,
      // sem data: URIs para manter a CSP estrita (img-src 'self')
      assetsInlineLimit: 0,
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }],
          },
        },
      },
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  };
});
