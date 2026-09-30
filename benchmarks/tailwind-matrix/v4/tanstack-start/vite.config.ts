// #region docs:vite-config title="vite.config.ts"
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackStart({ prerender: { enabled: true } }),
		react(),
	],
});
// #endregion docs:vite-config
