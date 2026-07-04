import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const dir = path.dirname(fileURLToPath(import.meta.url));
const stubPath = path.resolve(dir, './runtime/vue/stubs.ts');

function pathResolve(...segments: string[]): string {
	return path.resolve(dir, ...segments);
}

export function c15tVue(): Plugin {
	return {
		name: '@c15t/vue',
		enforce: 'pre',
		resolveId(id) {
			if (id === '#imports') {
				return stubPath;
			}
		},
		config() {
			return {
				resolve: {
					alias: {
						'#c15t/composables': pathResolve('./runtime/composables/index.ts'),
					},
				},
			};
		},
	};
}

export default c15tVue;
