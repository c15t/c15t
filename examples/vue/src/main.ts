// #region docs:main title="src/main.ts"
import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { scripts } from './scripts';

createApp(App)
	.use(c15tVue, {
		backendURL: 'https://your-project.inth.app',
		scripts,
	})
	.mount('#app');
// #endregion docs:main
