// #region docs:main title="src/main.ts"
import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { consentManifest } from './c15t-manifest';
import { scripts } from './scripts';

createApp(App)
	.use(c15tVue, {
		backendURL: import.meta.env.VITE_C15T_BACKEND_URL,
		manifest: 'client',
		manifestSnapshot: consentManifest,
		scripts,
	})
	.mount('#app');
// #endregion docs:main
