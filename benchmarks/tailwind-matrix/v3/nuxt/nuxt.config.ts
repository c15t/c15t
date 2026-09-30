// oxlint-disable sort-keys -- PostCSS runs plugins in the order listed.
// #region docs:nuxt-config title="nuxt.config.ts"
export default defineNuxtConfig({
	c15t: { backendURL: '/api/c15t' },
	compatibilityDate: '2026-07-04',
	css: ['~/assets/css/main.css'],
	modules: ['c15t/vue'],
	postcss: {
		plugins: {
			'@c15t/ui/postcss-tailwind3': {},
			tailwindcss: {},
			autoprefixer: {},
		},
	},
	ssr: false,
});
// #endregion docs:nuxt-config
