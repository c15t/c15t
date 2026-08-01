/**
 * Minimal @c15t/vue setup.
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
	modules: ['@c15t/vue'],
	c15t: {
		backendURL: process.env.NUXT_PUBLIC_C15T_BACKEND_URL ?? '/api/self-host',
		manifest: true,
	},
	devtools: { enabled: true },
	typescript: { strict: true },
	vite: {
		ssr: {
			// The SSR graph pulls in @vue/compiler-core's CJS build, whose
			// `require('estree-walker')` becomes a default-import when left
			// external — and estree-walker v2 is named-exports-only under
			// Node ESM. Bundling it lets Vite generate correct interop.
			noExternal: ['estree-walker'],
		},
	},
});
