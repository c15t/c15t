import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [preact(), tailwindcss()],
	optimizeDeps: {
		include: ['preact/hooks'],
	},
});
