import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	// Only the default `VITE_` prefix reaches `import.meta.env`. The backend
	// URL is deliberately public (`VITE_C15T_BACKEND_URL`); server-only
	// `C15T_*` secrets stay in `process.env` and never enter a bundle.
	plugins: [tanstackStart(), viteReact()],
});
