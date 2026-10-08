// #region docs:nuxt-config
export default defineNuxtConfig({
	c15t: {
		backendURL:
			process.env.NUXT_PUBLIC_C15T_BACKEND_URL ??
			'https://benchmarks-inth.inth.app',
		buildManifest: true,
	},
	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
});
// #endregion docs:nuxt-config
