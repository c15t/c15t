import { definePlugin } from 'nitro';
import { useNitroHooks } from 'nitro/app';
import { useRuntimeConfig } from 'nuxt/server';

import { applyInthProjectURL } from './inth-project-url';
import type { InthRuntimeConfig } from './inth-project-url';

export default definePlugin(() => {
	const env = globalThis.process?.env ?? {};
	if (!env.NUXT_PUBLIC_INTH_PROJECT_URL) {
		return;
	}
	useNitroHooks().hook('request', () => {
		applyInthProjectURL(
			useRuntimeConfig() as unknown as InthRuntimeConfig,
			env
		);
	});
});
