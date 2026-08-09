/**
 * Minimal c15t Nuxt setup, through the `c15t` umbrella package
 * (`c15t/vue` ≡ `@c15t/vue`).
 *
 * - `backendURL`: your c15t instance (or self-hosted @c15t/backend). This
 *   demo self-hosts the backend at `/api/self-host` (see
 *   `server/api/self-host/[...all].ts`), so the manifest is served from the
 *   same origin. Point `NUXT_PUBLIC_C15T_BACKEND_URL` elsewhere to use a
 *   hosted instance instead.
 * - `manifest: true`: the Nuxt module injects cached server routes
 *   (`/api/c15t/init`, `/api/c15t/manifest`) that resolve consent locally
 *   from the CDN-cacheable manifest — zero consent-backend round trips on
 *   the request path. Set `manifest: 'client'` for SPA/static hosting
 *   (the browser fetches the manifest once and resolves locally), or omit
 *   to call the backend `/init` directly (the v2-compatible default).
 */
export default defineNuxtConfig({
	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
	c15t: {
		backendURL: process.env.NUXT_PUBLIC_C15T_BACKEND_URL ?? '/api/self-host',
		manifest: true,
	},
	devtools: { enabled: true },
	typescript: { strict: true },
	vite: {
		ssr: {
			// Workaround, not a required part of the integration.
			//
			// @c15t/vue ships precompiled `.vue` SSR renders whose
			// `vue/server-renderer` import resolves to that package's CJS build.
			// Vite inlines it, and the CJS build carries @vue/compiler-ssr →
			// @vue/compiler-core → `require('estree-walker')`. Left external that
			// require becomes a default-import, and estree-walker v2 is
			// named-exports-only under Node ESM, so the built server throws
			// `does not provide an export named 'default'` on the first render.
			// Bundling it lets Vite generate correct interop.
			//
			// The real fix belongs upstream in @c15t/vue's build (the Vue
			// compiler has no business in a consumer's server bundle); remove
			// this block once `vue/server-renderer` resolves to ESM there.
			noExternal: ['estree-walker'],
		},
	},
});
