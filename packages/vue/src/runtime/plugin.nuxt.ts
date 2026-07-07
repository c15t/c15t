import type { InitOutput } from '@c15t/schema/types';
import { readStoredConsentFromCookie } from 'c15t/v3/modules/persistence';
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
	type RuntimeConsentConfig,
	startVueConsentRuntime,
} from './kernel';
import { resolveManifestMode } from './manifest';
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
			defu(
				appConfig.c15t,
				runtimeConfig.public.c15t
			) as Partial<RuntimeConsentConfig>
	);
	const headers = pickAllowedInitHeaders(
		useRequestHeaders([...INIT_HEADER_NAMES])
	);
	const cookieHeader =
		typeof document === 'undefined'
			? useRequestHeaders(['cookie']).cookie
			: document.cookie;
	const initFetchTarget = getNuxtInitFetchTarget(config.value);
	const manifestMode = resolveManifestMode(config.value);
	const initialStoredConsent = readStoredConsentFromCookie(
		cookieHeader,
		config.value.storageConfig
	);

	let prefetch: InitOutput | undefined;
	if (initFetchTarget) {
		const { data } = await useFetch<InitOutput>(initFetchTarget.url, {
			baseURL: initFetchTarget.baseURL,
			cache: manifestMode === 'server' ? undefined : 'no-store',
			headers,
			key: 'c15t:init',
		});
		prefetch = data.value ?? undefined;
	}

	nuxtApp.vueApp.provide(consentConfigKey, config);

	const context = createVueConsentKernelContext({
		config: config.value as ConsentConfig,
		headers,
		initialStoredConsent,
		prefetch,
	});

	nuxtApp.vueApp.provide(symbolKernelContext, context);
	nuxtApp.vueApp.provide(symbolKernel, context.kernel);
	nuxtApp.vueApp.provide(symbolSnapshot, context.snapshot);
	nuxtApp.vueApp.provide(symbolInit, context.init);
	nuxtApp.vueApp.provide(symbolActiveUI, context.activeUI);
	nuxtApp.vueApp.provide(symbolConsent, context.storedConsent);
	const disposeRuntime = startVueConsentRuntime(
		context,
		config.value as ConsentConfig,
		{
			runInit:
				!prefetch &&
				!(manifestMode === 'client' && typeof window === 'undefined'),
		}
	);
	// A Nuxt app normally lives until page unload, but hosts that unmount the
	// Vue app explicitly (tests, microfrontends) should tear the runtime down
	// with it — mirrors the plain Vue plugin in src/index.ts.
	nuxtApp.vueApp.onUnmount(disposeRuntime);
});
