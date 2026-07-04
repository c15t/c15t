import { defu } from 'defu';
import { computed } from 'vue';
import { defineNuxtPlugin, useAppConfig, useRuntimeConfig } from '#imports';
import { consentConfigKey } from './composables/config';
import type { ConsentConfig } from './config';
import { symbolActiveUI, symbolConsent, symbolInit } from './utils/symbols';

export default defineNuxtPlugin((nuxtApp) => {
	const appConfig = useAppConfig();
	const runtimeConfig = useRuntimeConfig();

	nuxtApp.vueApp.provide(
		consentConfigKey,
		computed(
			() =>
				defu(
					appConfig.c15t,
					runtimeConfig.public.c15t
				) as Partial<ConsentConfig>
		)
	);

	nuxtApp.vueApp.provide(symbolActiveUI, ref<ConsentActiveUI>(null));
	nuxtApp.vueApp.provide(
		symbolConsent,
		useCookie<Consent>('c15t:consent', () => ({
			policies: {},
			categories: {},
		}))
	);
	nuxtApp.vueApp.provide(symbolInit, ref<InitOutput>(null));
});
