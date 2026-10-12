import { c15tVue, hosted } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { scripts } from './scripts';
import { testBackend } from './test-backend';

createApp(App)
	.use(c15tVue, {
		components: {
			banner: { card: { class: 'brand-consent-card' } },
		},
		mode: hosted({
			backendURL: 'https://your-project.inth.app',
			...testBackend('backendURL'),
		}),
		presentation: {
			prompt: { position: 'bottom', variant: 'bar' },
		},
		scripts,
		tokens: {
			'c15t-primary': '#6943a3',
			'c15t-primary-hover': '#533285',
			'c15t-radius-lg': '18px',
			'c15t-text-on-primary': '#ffffff',
		},
	})
	.mount('#app');
