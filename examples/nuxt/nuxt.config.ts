/**
 * Demo shell for the c15t Nuxt example.
 *
 * The consent setup lives in a layer so the docs can publish it unchanged:
 *
 * - `config/server`: request-time server rendering with `manifest: 'server'`.
 * - `config/static`: prerendered or SPA output with `manifest: 'client'`.
 *   Selected with `C15T_NUXT_OUTPUT=static` and built with `nuxt generate`.
 *
 * Everything here is demo-only: the self-hosted backend fallback, the
 * system color scheme with its dark primary, styles, the
 * test switch for client manifest mode, and two copies of `/consent-example`
 * whose HTML every visitor shares (`routeRules`), one prerendered at build
 * time and one cached by Nitro. c15t leaves visitor state out of that HTML
 * and resolves the visitor in the browser after hydration.
 * `C15T_NUXT_MANIFEST=client` builds the server output in client mode.
 *
 * Module config is static, so the banner-shape experiment is switched on at
 * build time with `C15T_NUXT_EXPERIMENT=1`. `C15T_NUXT_EXPERIMENT_ARM` stands
 * in for a flag provider: `wall` runs the wall arm, any other value runs
 * `control` (the default banner), and leaving it unset lets c15t pick. These
 * are not `NUXT_PUBLIC_*` names because Nitro would apply those at runtime
 * over `runtimeConfig.public.c15t.experiment`.
 */
import type { ModuleOptions } from 'c15t/vue';

const staticOutput = process.env.C15T_NUXT_OUTPUT === 'static';
const experimentArm = process.env.C15T_NUXT_EXPERIMENT_ARM;
const experiment =
	process.env.C15T_NUXT_EXPERIMENT === '1'
		? {
				arms: { wall: { prompt: { variant: 'wall' as const } } },
				id: 'banner-shape',
				...(experimentArm !== undefined && {
					arm: experimentArm === 'wall' ? 'wall' : 'control',
				}),
			}
		: undefined;

const c15t: ModuleOptions = {
	// This demo self-hosts @c15t/backend at `/api/self-host` (see
	// `server/api/self-host/[...all].ts`) when no backend URL is set.
	backendURL: process.env.NUXT_PUBLIC_C15T_BACKEND_URL ?? '/api/self-host',
	// Follow the visitor's system setting, with a dark primary of our own.
	colorScheme: 'system',
	experiment,
	theme: { dark: { primary: '#7fd1a8' } },
};
// Left unset otherwise, so the layer's `manifest` applies.
if (process.env.C15T_NUXT_MANIFEST === 'client') {
	c15t.manifest = 'client';
}

export default defineNuxtConfig({
	c15t,
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
