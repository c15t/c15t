// Type test for the options a Nuxt app passes to c15t. `check-types:nuxt`
// checks it through the playground, where Nuxt applies the module's type
// augmentations the same way it does in an application.
import type { BlockedRequestInfo } from '@c15t/core/modules/network-blocker';
import { expectTypeOf } from 'vitest';

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

// The domain the hosted transport sends with consent requests.
expectTypeOf<{ domain: 'example.com' }>().toExtend<ModuleOptions>();
export const wrongDomain: ModuleOptions = {
	// @ts-expect-error A domain is a string.
	domain: 1,
};

export const unknownAppConfig = defineAppConfig({
	c15t: {
		// @ts-expect-error Unknown keys are not c15t options.
		notAnOption: true,
	},
});
