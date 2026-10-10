// oxlint-disable sort-keys -- PostCSS runs plugins in the order listed.
// #region docs:nuxt-config title="nuxt.config.ts"
import { hosted } from 'c15t/vue';

export default defineNuxtConfig({
	c15t: { backendURL: '/api/c15t', mode: hosted() },
	compatibilityDate: '2026-07-04',
	css: ['~/assets/css/main.css'],
	modules: ['c15t/vue'],
	postcss: {
		plugins: {
			'c15t/postcss-tailwind3': {},
			tailwindcss: {},
			autoprefixer: {},
		},
	},
	ssr: false,
});
// #endregion docs:nuxt-config
