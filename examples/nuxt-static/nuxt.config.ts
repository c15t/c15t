// #region docs:static-config
import { manifest } from 'c15t/vue';

export default defineNuxtConfig({
	c15t: {
		// A static host has no server: the browser resolves the policy the
		// build bundled, and the module adds no consent route.
		mode: manifest({ resolve: 'browser' }),
		routePrefix: false,
	},
	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
	ssr: false,
});
// #endregion docs:static-config
