/**
 * Minimal @c15t/vue setup.
 *
 * - `backendURL`: your c15t instance (or self-hosted @c15t/backend).
 * - `manifest: true`: the Nuxt module injects cached server routes
 *   (`/api/c15t/init`, `/api/c15t/manifest`) that resolve consent locally
 *   from the CDN-cacheable manifest — zero consent-backend round trips on
 *   the request path. Set `manifest: 'client'` for SPA/static hosting
 *   (the browser fetches the manifest once and resolves locally), or omit
 *   to call the backend `/init` directly (the v2-compatible default).
 */
export default defineNuxtConfig({
	compatibilityDate: '2026-07-04',
	modules: ['@c15t/vue'],
	c15t: {
		backendURL:
			process.env.NUXT_PUBLIC_C15T_BACKEND_URL ??
			'https://nuxt-consent-io.inth.app',
		manifest: true,
		consentCategories: [
			'necessary',
			'functionality',
			'measurement',
			'marketing',
		],
	},
	devtools: { enabled: true },
	typescript: { strict: true },
});
