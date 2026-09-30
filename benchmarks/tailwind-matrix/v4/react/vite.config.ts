// #region docs:vite-config title="vite.config.ts"
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [react(), tailwindcss()] });
// #endregion docs:vite-config
