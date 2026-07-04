import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Nuxt } from 'nuxt/schema';

const rootDir = dirname(fileURLToPath(import.meta.url));
const vueDistRuntimeDir = resolve(
	rootDir,
	'../../../packages/vue/dist/runtime'
);

export default function c15tVueDistAlias(_options: unknown, nuxt: Nuxt) {
	nuxt.options.alias['#c15t/composables'] = resolve(
		vueDistRuntimeDir,
		'composables/index.js'
	);
}
