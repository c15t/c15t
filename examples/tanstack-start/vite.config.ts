// #region docs:vite-config
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/tanstack-start/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest(), tanstackStart(), viteReact()],
});
// #endregion docs:vite-config
