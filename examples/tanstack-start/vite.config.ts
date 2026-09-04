import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	// Expose `C15T_*` variables on `import.meta.env` in both bundles, so the
	// same `backendURL` reaches the server function and `ConsentBoundary`.
	envPrefix: ['VITE_', 'C15T_'],
	plugins: [tanstackStart(), viteReact()],
});
