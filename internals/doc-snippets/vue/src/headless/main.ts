// #region docs:headless-main title="src/main.ts"
import { c15tVue, manifest } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { scripts } from './scripts';

createApp(App)
	.use(c15tVue, {
		mode: manifest(),
		scripts,
	})
	.mount('#app');
// #endregion docs:headless-main
