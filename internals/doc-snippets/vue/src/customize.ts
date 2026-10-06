// #region docs:customize title="src/main.ts"
import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { scripts } from './scripts';

createApp(App)
	.use(c15tVue, {
		backendURL: 'https://your-project.inth.app',
		components: {
			banner: { card: { class: 'brand-consent-card' } },
		},
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
// #endregion docs:customize
