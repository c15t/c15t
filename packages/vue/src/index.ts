import type { ConsentRuntime } from '@c15t/core/runtime';
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

/** Options accepted by the {@link c15tVue} plugin. */
export type C15tVuePluginOptions = Partial<ConsentConfig> & {
	/**
	 * A runtime this app should render instead of building its own kernel.
	 *
	 * Hosts without a single component tree — an Astro page whose islands
	 * cannot see each other, a SvelteKit layout — create one runtime with
	 * `createConsentRuntime()` and hand it to whatever renders. The plugin
	 * then neither starts nor disposes it, and mounts none of the modules
	 * the runtime already owns.
	 *
	 * @example
	 * ```ts
	 * import { createApp } from 'vue';
	 * import { c15tVue } from '@c15t/vue/vue-plugin';
	 *
	 * createApp(Dialog).use(c15tVue, { runtime }).mount(target);
	 * ```
	 */
	runtime?: ConsentRuntime;
};

export const c15tVue: Plugin<[C15tVuePluginOptions?]> = {
	install(app: App, options?: C15tVuePluginOptions) {
		if (options) {
			app.provide(consentConfigKey, options);
		}

		const { runtime, ...rest } = options ?? {};
		const config = rest as ConsentConfig;
		const context = createVueConsentKernelContext({ config, runtime });
		app.provide(symbolKernelContext, context);
		app.provide(symbolKernel, context.kernel);
		app.provide(symbolSnapshot, context.snapshot);
		app.provide(symbolInit, context.init);
		app.provide(symbolActiveUI, context.activeUI);
		app.provide(symbolConsent, context.storedConsent);
		const disposeRuntime = startVueConsentRuntime(context, config);
		// `app.onUnmount` is Vue 3.5+. On older runtimes skip cleanup
		// registration rather than throwing during plugin install.
		if (typeof app.onUnmount === 'function') {
			app.onUnmount(disposeRuntime);
		}
	},
};
