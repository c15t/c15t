import { c15tVue, hosted } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { scripts } from './scripts';
import { testBackend } from './test-backend';

createApp(App)
	.use(c15tVue, {
		mode: hosted({
			backendURL: 'https://your-project.inth.app',
			...testBackend('backendURL'),
		}),
		scripts,
	})
	.mount('#app');
