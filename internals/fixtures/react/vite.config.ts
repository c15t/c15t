import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				// `experiment.html` mounts the same app with the banner experiment.
				experiment: fileURLToPath(new URL('experiment.html', import.meta.url)),
				main: fileURLToPath(new URL('index.html', import.meta.url)),
			},
		},
	},
	plugins: [react()],
});
