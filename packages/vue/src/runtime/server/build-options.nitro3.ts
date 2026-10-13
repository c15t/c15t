import { definePlugin } from 'nitro';
import { useNitroHooks } from 'nitro/app';
import { useRuntimeConfig } from 'nuxt/server';

import built from '#c15t/build-options';

import {
	createBuildOptionsGuard,
	formatBuildOptionWarning,
} from './build-options';
import type { BuiltOptionsRuntimeConfig } from './build-options';

export default definePlugin(() => {
	const guard = createBuildOptionsGuard(built, (name) => {
		console.warn(formatBuildOptionWarning(built, name));
	});
	useNitroHooks().hook('request', () => {
		guard(useRuntimeConfig() as unknown as BuiltOptionsRuntimeConfig);
	});
});
