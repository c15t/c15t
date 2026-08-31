import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export const c15tVue = function c15tVue(): Plugin {
	return {
		config() {
			return {
				resolve: {
					alias: {
						'#c15t/composables': resolveRuntimeModule(
							'./runtime/composables/index.ts',
							'./runtime/composables/index.js'
						),
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
		},
	};
};

export default c15tVue;
