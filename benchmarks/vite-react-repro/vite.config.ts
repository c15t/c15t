import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		sourcemap: true,
		target: 'es2022',
	},
	plugins: [
		react(),
		visualizer({
			brotliSize: true,
			emitFile: false,

			filename: 'dist/stats.html',
			gzipSize: true,
			template: 'treemap',
		}),
		visualizer({
			brotliSize: true,
			emitFile: false,

			filename: 'dist/stats.json',
			gzipSize: true,
			template: 'raw-data',
		}),
	],
});
