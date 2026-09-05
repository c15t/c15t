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
			// `src/middleware.ts` registers the shipped middleware itself, so
			// it can skip `/api/` — see the note there.
			middleware: false,
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
			middleware: false,
			mode: hosted({ url: backendURL }),
		})
	);
}

/**
 * The baseline build has no `c15t()` integration, so nothing generates
 * `virtual:c15t/options`. Stub it to `null` there — `src/middleware.ts`
 * reads that as "no consent middleware on this build".
 */
const baselineVirtualOptions = {
	load(id) {
		return id === '\0virtual:c15t/options' ? 'export default null;' : undefined;
	},
	name: 'c15t-bench:baseline-options',
	resolveId(id) {
		return id === 'virtual:c15t/options' ? '\0virtual:c15t/options' : undefined;
	},
};

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations,
	outDir: process.env.C15T_BENCH_OUT_DIR ?? './dist',
	output: 'server',
	vite:
		benchMode === 'baseline'
			? { plugins: [baselineVirtualOptions] }
			: undefined,
});
