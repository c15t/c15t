import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConsentManifestPlugin } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';
import type { Plugin } from 'vite';

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Source builds ship .ts, dist builds ship .js — resolve whichever exists
 * (hardcoding .ts broke every consumer of the published package; the Nuxt
 * module entry probes the same way).
 */
const resolveRuntimeModule = function resolveRuntimeModule(
	...candidates: string[]
): string {
	return candidates
		.map((candidate) => path.resolve(dir, candidate))
		.find((candidatePath) => existsSync(candidatePath)) as string;
};

const stubPath = resolveRuntimeModule(
	'./runtime/vue/stubs.ts',
	'./runtime/vue/stubs.js'
);

const composablesPath = resolveRuntimeModule(
	'./runtime/composables/index.ts',
	'./runtime/composables/index.js'
);

/**
 * Resolve the Nuxt-shaped specifiers `@c15t/vue`'s shared runtime uses.
 *
 * `#imports` and `#c15t/composables` are Nuxt virtuals; a plain Vue or
 * Astro app has neither. Both are answered from `resolveId` rather than
 * `resolve.alias` alone: a host that sets its own aliases in array form
 * (Astro does) replaces the object this plugin's `config()` contributes
 * instead of merging with it, and the composables specifier then reaches
 * Rollup unresolved. The alias stays for anything that reads it directly.
 *
 * @returns The Vite plugin to list in a non-Nuxt app's config.
 */
export const c15tVue = function c15tVue(): Plugin {
	return {
		config() {
			return {
				resolve: {
					alias: {
						'#c15t/composables': composablesPath,
					},
				},
			};
		},
		enforce: 'pre',
		name: '@c15t/vue',
		resolveId(id) {
			if (id === '#imports') {
				return stubPath;
			}
			if (id === '#c15t/composables') {
				return composablesPath;
			}
		},
	};
};

export default c15tVue;
export type {
	ConsentManifest,
	ManifestBuildErrorMode,
	ManifestBuildOptions,
} from '@c15t/core/build';

/**
 * Generates a manifest before plain Vue compilation.
 *
 * `backendURL` defaults to `VITE_C15T_BACKEND_URL`, including `.env` files.
 * A failed fetch stops `vite build` and warns in `vite dev`, where the
 * generated module exports `undefined`. Set `onBuildError` or
 * `C15T_ON_BUILD_ERROR` to change that.
 *
 * @param options - Backend URL and generated module settings. Appends `/manifest`.
 * @returns A Vite plugin using `@c15t/vue/vite` for its type import.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `vite build`, or the file cannot be written.
 */
export const consentManifest = (options: ManifestBuildOptions = {}) =>
	createConsentManifestPlugin(options, {
		envNames: ['VITE_C15T_BACKEND_URL'],
		importSource: '@c15t/vue/vite',
		label: '@c15t/vue/vite',
	});
