// Type test for the options a Nuxt app passes to c15t. `check-types:nuxt`
// checks it through the playground, where Nuxt applies the module's type
// augmentations the same way it does in an application.
import type { BlockedRequestInfo } from '@c15t/core/modules/network-blocker';
import type { NitroRouteConfig } from 'nitropack/types';
import { expectTypeOf } from 'vitest';

import type { hosted, manifest } from '../src/module';
import type { ModuleOptions } from '../src/nuxt-options';

// Module options accept every runtime option that survives JSON.
expectTypeOf<{
	iframeBlocker: false;
	nonce: string;
	networkBlocker: {
		rules: [{ category: 'measurement'; domain: 'tracker.example' }];
	};
}>().toExtend<ModuleOptions>();
expectTypeOf<{
	iframeBlocker: { disableAutomaticBlocking: true };
}>().toExtend<ModuleOptions>();

export const moduleOptions: ModuleOptions = {
	networkBlocker: {
		// @ts-expect-error A callback cannot pass through `runtimeConfig.public`.
		onRequestBlocked: () => undefined,
		rules: [],
	},
};

// `app.config.ts` is bundled with the app, so it takes the callback.
export const appConfig = defineAppConfig({
	c15t: {
		iframeBlocker: false,
		networkBlocker: {
			onRequestBlocked: (info) => {
				expectTypeOf(info).toEqualTypeOf<BlockedRequestInfo>();
			},
			rules: [{ category: 'measurement', domain: 'tracker.example' }],
		},
		nonce: 'nonce-value',
	},
});

export const wrongAppConfig = defineAppConfig({
	c15t: {
		// @ts-expect-error A nonce is a string.
		nonce: 1,
	},
});

export const readAppConfig = () => {
	expectTypeOf(useAppConfig().c15t?.nonce).toEqualTypeOf<string | undefined>();
};

// Storage options are JSON and reach the runtime from module options.
expectTypeOf<{
	storageConfig: { crossSubdomain: true; storageKey: 'consent' };
}>().toExtend<ModuleOptions>();

// `mode` is the data the module entry's factories return, and
// `routePrefix` a path or `false`. Both are `nuxt.config.ts` options.
expectTypeOf<{
	mode: ReturnType<typeof manifest>;
	routePrefix: false;
}>().toExtend<ModuleOptions>();
expectTypeOf<{ mode: ReturnType<typeof hosted> }>().toExtend<ModuleOptions>();
export const wrongRoutePrefix: ModuleOptions = {
	// @ts-expect-error A route prefix is a path or `false`.
	routePrefix: true,
};
export const modeInAppConfig = defineAppConfig({
	c15t: {
		// @ts-expect-error The build reads `mode` from nuxt.config.ts only.
		mode: { type: 'hosted' },
	},
});

export const unknownAppConfig = defineAppConfig({
	c15t: {
		// @ts-expect-error Unknown keys are not c15t options.
		notAnOption: true,
	},
});

// The early `/init` script for `ssr: false` pages: a module option, and a
// route rule that turns it off for some routes.
expectTypeOf<{ initPrefetch: false }>().toExtend<ModuleOptions>();
expectTypeOf<NitroRouteConfig['c15t']>().toEqualTypeOf<
	{ initPrefetch?: boolean } | undefined
>();
export const wrongRouteRule: NitroRouteConfig = {
	// @ts-expect-error The route rule takes a boolean.
	c15t: { initPrefetch: 'no' },
};
