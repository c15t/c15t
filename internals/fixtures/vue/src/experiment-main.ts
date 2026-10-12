/**
 * Demo only: `main.ts` with the banner-shape experiment, mounted by
 * `entry.ts` for `?experiment=1`. `&arm=wall` sets the arm the way a flag
 * provider would. See `experiment.ts`.
 */
import { c15tVue, hosted } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { experimentCallbacks, experimentFromSearch } from './experiment';
import { scripts } from './scripts';
import { testBackend } from './test-backend';

createApp(App)
	.use(c15tVue, {
		callbacks: experimentCallbacks,
		experiment: experimentFromSearch(location.search),
		mode: hosted({
			backendURL: 'https://your-project.inth.app',
			...testBackend('backendURL'),
		}),
		scripts,
	})
	.mount('#app');
