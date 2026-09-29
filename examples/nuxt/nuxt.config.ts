/**
 * Demo shell for the c15t Nuxt example.
 *
 * The consent setup lives in a layer so the docs can publish it unchanged:
 *
 * - `config/server`: request-time server rendering with `manifest: 'server'`.
 * - `config/static`: prerendered or SPA output with `manifest: 'client'`.
 *   Selected with `C15T_NUXT_OUTPUT=static` and built with `nuxt generate`.
 *
 * Everything here is demo-only: the self-hosted backend fallback, styles, the
 * test switch for client manifest mode, and two copies of `/consent-example`
 * whose HTML every visitor shares (`routeRules`), one prerendered at build
 * time and one cached by Nitro. c15t leaves visitor state out of that HTML
 * and resolves the visitor in the browser after hydration.
 * `C15T_NUXT_MANIFEST=client` builds the server output in client mode.
 */
const staticOutput = process.env.C15T_NUXT_OUTPUT === 'static';
const clientManifest = process.env.C15T_NUXT_MANIFEST === 'client';

export default defineNuxtConfig({
	c15t: {
		// This demo self-hosts @c15t/backend at `/api/self-host` (see
		// `server/api/self-host/[...all].ts`) when no backend URL is set.
		backendURL: process.env.NUXT_PUBLIC_C15T_BACKEND_URL ?? '/api/self-host',
		...(clientManifest ? { manifest: 'client' as const } : {}),
	},
	compatibilityDate: '2026-07-04',
	css: ['~/consent-example.css'],
	devtools: { enabled: true },
	extends: [staticOutput ? './config/static' : './config/server'],
	// `vite preview` serves `/consent-example` from `consent-example.html`.
	nitro: staticOutput ? { prerender: { autoSubfolderIndex: false } } : {},
	routeRules: staticOutput
		? {}
		: {
				'/cached/consent-example': { swr: 60 },
				'/prerendered/consent-example': { prerender: true },
			},
	typescript: { strict: true },
});
