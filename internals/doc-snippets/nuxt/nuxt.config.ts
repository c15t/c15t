/**
 * Type-checked Nuxt snippets for the docs. Nothing here runs: the app
 * registers the module so `nuxt typecheck` can check each file against its
 * auto-imported components and composables.
 */
export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		// #region docs:color-scheme title="nuxt.config.ts (c15t options)"
		// Follow the visitor's system setting, with a dark primary of our own.
		colorScheme: 'system',
		theme: { dark: { primary: '#7fd1a8' } },
		// #endregion docs:color-scheme
	},
	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
	typescript: { strict: true },
});
