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
 *   `C15T_NUXT_MANIFEST=client` builds the demo in client mode.
 * - `routeRules`: two copies of `/consent-example` whose HTML every visitor
 *   shares, one prerendered at build time and one cached by Nitro. c15t
 *   leaves visitor state out of that HTML and resolves the visitor in the
 *   browser after hydration.
 */
/**
 * Module config is static, so the banner-shape experiment is switched on
 * at build time, the way `C15T_IAB` gates the Astro demo:
 *
 *   NUXT_PUBLIC_C15T_EXPERIMENT=1 bun run --cwd examples/nuxt dev
 *   NUXT_PUBLIC_C15T_EXPERIMENT=1 NUXT_PUBLIC_C15T_EXPERIMENT_ARM=wall ...
 *
 * The arm env stands in for a flag provider: `wall` runs the wall arm, any
 * other value runs `control` (the default banner), and leaving it unset lets
 * c15t pick. The page lists impressions and choices from the kernel's events.
 */
const experimentArm = process.env.NUXT_PUBLIC_C15T_EXPERIMENT_ARM;
const experiment =
	process.env.NUXT_PUBLIC_C15T_EXPERIMENT === '1'
		? {
				arms: { wall: { prompt: { variant: 'wall' as const } } },
				id: 'banner-shape',
				...(experimentArm !== undefined && {
					arm: experimentArm === 'wall' ? 'wall' : 'control',
				}),
			}
		: undefined;

export default defineNuxtConfig({
	c15t: {
		backendURL: process.env.NUXT_PUBLIC_C15T_BACKEND_URL ?? '/api/self-host',
		experiment,
		manifest: process.env.C15T_NUXT_MANIFEST === 'client' ? 'client' : true,
	},
	compatibilityDate: '2026-07-04',
	devtools: { enabled: true },
	modules: ['c15t/vue'],
	routeRules: {
		'/cached/consent-example': { swr: 60 },
		'/prerendered/consent-example': { prerender: true },
	},
	runtimeConfig: { public: { posthogKey: '', xPixelId: '' } },
	typescript: { strict: true },
});
