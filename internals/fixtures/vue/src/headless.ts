import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './HeadlessApp.vue';
import { scripts } from './scripts';
import { testBackend } from './test-backend';

createApp(App)
	.use(c15tVue, {
		backendURL: 'https://your-project.inth.app',
		...testBackend('backendURL'),
		scripts,
	})
	.mount('#app');
