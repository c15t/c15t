import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import './style.css';
import App from './App.vue';

createApp(App)
	// #region docs:slot
	.use(c15tVue, {
		backendURL: '/api/c15t',
		components: {
			banner: {
				root: { class: 'p-[7px] dark:p-[11px]' },
			},
		},
	})
	// #endregion docs:slot
	.mount('#app');
