// #region docs:vite-config
import { consentManifest } from 'c15t/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest()],
});
// #endregion docs:vite-config
