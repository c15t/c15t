import { c15tVue } from 'c15t/vue/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { experimentFromSearch } from './experiment';

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

// `?experiment=1` runs the banner-shape experiment; `&arm=wall` forces the
// arm. Without the param the plugin gets no `experiment` option.
const experiment = experimentFromSearch(location.search);

createApp(App)
	.use(c15tVue, { backendURL, experiment, showTrigger: true, tokens })
	.mount('#app');
