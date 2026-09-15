import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';

import './style.css';

const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
}
const branded =
	new URLSearchParams(location.search).get('design') === 'branded';
const tokens = branded
	? {
			'c15t-primary': '#6943a3',
			'c15t-primary-hover': '#533285',
			'c15t-radius-lg': '18px',
			'c15t-text-on-primary': '#ffffff',
		}
	: undefined;

createApp(App)
	.use(c15tVue, { backendURL, showTrigger: true, tokens })
	.mount('#app');
