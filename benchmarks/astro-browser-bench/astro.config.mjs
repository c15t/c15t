import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import c15t, { hosted, manifest } from '@c15t/astro';
import { defineConfig } from 'astro/config';

/**
 * One app, three builds.
 *
 * Astro serializes the integration's options into a virtual module at build
 * time, so a page cannot pick its transport the way the Nuxt bench's route
 * plugin does. `C15T_BENCH_ASTRO_MODE` picks it instead, and the runner
 * builds each variant into its own `outDir` and serves the arms that belong
 * to it:
 *
 * - `manifest` (default) — `/ssr-manifest`, `/ssr-deferred`, `/repeat-visitor`
 * - `hosted` — `/ssr`, the direct-init arm that pays the backend RTT
 * - `baseline` — `/baseline`, built with no c15t integration at all, which
 *   is the zero-consent floor `consentTax = bannerVisible − floor` subtracts
 *
 * Absolute fixture URLs on purpose: the shared resolver assumes `https` for
 * a relative URL with no `x-forwarded-proto`, which a plain HTTP bench
 * server does not speak.
 *
 * The shipped `pre` middleware is registered as it would be on a real site.
 * It skips the integration's own init and manifest routes, so serving the
 * manifest from this same process does not make the manifest request
 * resolve consent, which would fetch the manifest, which would resolve
 * consent.
 */
const benchMode = process.env.C15T_BENCH_ASTRO_MODE ?? 'manifest';
const origin = process.env.C15T_BENCH_ORIGIN ?? 'http://127.0.0.1:4353';
const backendURL = `${origin}/api/bench-consent`;

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
];

const integrations = [svelte()];

if (benchMode === 'manifest') {
	integrations.push(
		c15t({
			consentCategories,
			// The fixture backend lives under `/api/bench-consent`, which the
			// integration does not know about; the manifest route it does
			// know about is skipped for it.
			middleware: { skip: ['/api/bench-consent'] },
			mode: manifest({
				backendURL,
				manifestURL: `${backendURL}/manifest`,
			}),
		})
	);
} else if (benchMode === 'hosted') {
	integrations.push(
		c15t({
			consentCategories,
			middleware: { skip: ['/api/bench-consent'] },
			mode: hosted({ url: backendURL }),
		})
	);
}

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations,
	outDir: process.env.C15T_BENCH_OUT_DIR ?? './dist',
	output: 'server',
});
