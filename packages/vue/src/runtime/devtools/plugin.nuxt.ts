import { inject, toValue } from 'vue';

import { defineNuxtPlugin } from '#imports';

import { consentConfigKey } from '../composables/config';
import { symbolKernelContext } from '../utils/symbols';
import { registerDevToolsBridge } from './bridge';
import { readDisplayedCategories } from './services';

/**
 * Development-only client plugin: exposes the app's kernel to the c15t tab
 * in Nuxt DevTools. The module registers it after the consent plugin.
 */
export default defineNuxtPlugin({
	name: 'c15t:devtools',
	setup(nuxtApp) {
		const { config, context } = nuxtApp.vueApp.runWithContext(() => ({
			config: inject(consentConfigKey, undefined),
			context: inject(symbolKernelContext, undefined),
		}));
		if (!context) {
			return;
		}
		const unregister = registerDevToolsBridge(window, {
			clearRecords: () => context.clearRecords(),
			getConsentCategories: () =>
				readDisplayedCategories(
					context.kernel,
					toValue(config)?.consentCategories
				),
			getPresentation: () => toValue(config)?.presentation,
			kernel: context.kernel,
		});
		nuxtApp.vueApp.onUnmount(unregister);
		import.meta.hot?.dispose(unregister);
	},
});
