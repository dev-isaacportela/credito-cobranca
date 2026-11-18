import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Porta 5185 (.claude/launch.json); o simulador fica na 3115 (src/lib/mitra-auth.ts).
// `dedupe`: a @benenutri/mitra-kanban traz React e radix-ui como pares; uma segunda cópia quebra os hooks.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'radix-ui', 'cmdk', 'lucide-react'],
  },
  server: { port: 5185, strictPort: true },
});
