// #region docs:vite-config
import react from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react(), consentManifest()],
});
// #endregion docs:vite-config
