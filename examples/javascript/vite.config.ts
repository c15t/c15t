import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				branded: page('./branded/index.html'),
				headless: page('./headless/index.html'),
				main: page('./index.html'),
			},
		},
	},
});
