import type { App, Plugin } from 'vue';
import { consentConfigKey } from './runtime/composables/config';
import type { ConsentConfig } from './runtime/config';
import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from './runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from './runtime/utils/symbols';

export type * from '@c15t/schema/config';
export * from './runtime/composables';
export type {
	ConsentConfig,
	ConsentConfig as VueConsentConfig,
} from './runtime/config';

export const c15tVue: Plugin<[Partial<ConsentConfig>?]> = {
	install(app: App, options?: Partial<ConsentConfig>) {
		if (options) {
			app.provide(consentConfigKey, options);
		}

		const config = (options ?? {}) as ConsentConfig;
		const context = createVueConsentKernelContext({ config });
		app.provide(symbolKernelContext, context);
		app.provide(symbolKernel, context.kernel);
		app.provide(symbolSnapshot, context.snapshot);
		app.provide(symbolInit, context.init);
		app.provide(symbolActiveUI, context.activeUI);
		app.provide(symbolConsent, context.storedConsent);
		startVueConsentRuntime(context, config);
	},
};
