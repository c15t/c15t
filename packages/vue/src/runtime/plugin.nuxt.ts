import type { InitOutput } from '@c15t/schema/types';
import { defu } from 'defu';
import { computed } from 'vue';
import {
	defineNuxtPlugin,
	useAppConfig,
	useFetch,
	useRequestHeaders,
	useRuntimeConfig,
} from '#imports';
import { consentConfigKey } from './composables/config';
import type { ConsentConfig } from './config';
import {
	createVueConsentKernelContext,
	getNuxtInitFetchTarget,
	INIT_HEADER_NAMES,
	pickAllowedInitHeaders,
	startVueConsentRuntime,
} from './kernel';
import { isManifestModeEnabled } from './manifest';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from './utils/symbols';

export default defineNuxtPlugin(async (nuxtApp) => {
	const appConfig = useAppConfig();
	const runtimeConfig = useRuntimeConfig();
	const config = computed(
		() =>
			defu(appConfig.c15t, runtimeConfig.public.c15t) as Partial<ConsentConfig>
	);
	const headers = pickAllowedInitHeaders(
		useRequestHeaders([...INIT_HEADER_NAMES])
	);
	const initFetchTarget = getNuxtInitFetchTarget(config.value);
	const manifestMode = isManifestModeEnabled(config.value);

	const { data } = await useFetch<InitOutput>(initFetchTarget.url, {
		baseURL: initFetchTarget.baseURL,
		cache: manifestMode ? undefined : 'no-store',
		headers,
		key: 'c15t:init',
	});

	nuxtApp.vueApp.provide(consentConfigKey, config);

	const context = createVueConsentKernelContext({
		config: config.value as ConsentConfig,
		headers,
		prefetch: data.value ?? undefined,
	});

	nuxtApp.vueApp.provide(symbolKernelContext, context);
	nuxtApp.vueApp.provide(symbolKernel, context.kernel);
	nuxtApp.vueApp.provide(symbolSnapshot, context.snapshot);
	nuxtApp.vueApp.provide(symbolInit, context.init);
	nuxtApp.vueApp.provide(symbolActiveUI, context.activeUI);
	nuxtApp.vueApp.provide(symbolConsent, context.storedConsent);
	startVueConsentRuntime(context, config.value as ConsentConfig, {
		runInit: !data.value,
	});
});
