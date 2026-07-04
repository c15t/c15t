import type { App, Plugin } from 'vue';
import { consentConfigKey } from './runtime/composables/config';
import type { ConsentConfig } from './runtime/config';

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
	},
};
