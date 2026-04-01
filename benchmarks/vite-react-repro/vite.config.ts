import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		react(),
		visualizer({
			filename: 'dist/stats.html',
			gzipSize: true,
			brotliSize: true,
			template: 'treemap',
			emitFile: false,
		}),
		visualizer({
			filename: 'dist/stats.json',
			gzipSize: true,
			brotliSize: true,
			template: 'raw-data',
			emitFile: false,
		}),
	],
	build: {
		sourcemap: true,
		target: 'es2022',
	},
});
