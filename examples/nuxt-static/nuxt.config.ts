// #region docs:static-config
export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		manifest: 'client',
		manifestURL: 'https://your-project.inth.app/manifest',
	},
	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
	ssr: false,
});
// #endregion docs:static-config
