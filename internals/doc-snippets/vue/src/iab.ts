// #region docs:iab-opt-in title="src/main.ts"
import { c15tVue, hosted } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';

createApp(App)
	.use(c15tVue, {
		// Turns IAB TCF on. The CMP ID and vendor list come from `/init`.
		iab: {},
		mode: hosted(),
	})
	.mount('#app');
// #endregion docs:iab-opt-in
