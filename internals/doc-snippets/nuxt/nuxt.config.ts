/**
 * Type-checked Nuxt snippets for the docs. Nothing here runs: the app
 * registers the module so `nuxt typecheck` can check each file against its
 * auto-imported components and composables.
 */
export default defineNuxtConfig({
	// oxlint-disable-next-line sort-keys -- Each docs region stays contiguous.
	c15t: {
		backendURL: 'https://your-project.inth.app',
		// #region docs:color-scheme title="nuxt.config.ts (c15t options)"
		// Follow the visitor's system setting, with a dark primary of our own.
		colorScheme: 'system',
		theme: { dark: { primary: '#7fd1a8' } },
		// #endregion docs:color-scheme
		// #region docs:shopify-categories title="nuxt.config.ts (c15t options)"
		// The categories the Shopify bridge maps. Shopify's scripts load outside
		// c15t, so c15t can't discover them.
		consentCategories: ['measurement', 'marketing', 'functionality'],
		// #endregion docs:shopify-categories
		// #region docs:iab-opt-in title="nuxt.config.ts (c15t options)"
		// Turns IAB TCF on. The CMP ID and vendor list come from `/init`.
		iab: {},
		// #endregion docs:iab-opt-in
	},
	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
	typescript: { strict: true },
});
