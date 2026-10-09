// #region docs:main title="src/main.ts"
import { snapshot } from 'c15t/generated';
import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { scripts } from './scripts';

createApp(App)
	.use(c15tVue, {
		backendURL: import.meta.env.VITE_C15T_BACKEND_URL,
		manifest: 'client',
		// The policy consentManifest() in vite.config.ts downloaded.
		manifestSnapshot: snapshot,
		scripts,
	})
	.mount('#app');
// #endregion docs:main
