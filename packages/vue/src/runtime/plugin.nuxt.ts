import { C15T_POLICY_CONTRACT_HEADER, c15tProtocolHeaders } from '@c15t/core';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import type { InitOutput } from '@c15t/schema/types';
import { defu } from 'defu';
import { computed } from 'vue';

import {
	defineNuxtPlugin,
	useAppConfig,
	useFetch,
	useRequestHeaders,
	useRuntimeConfig,
	useState as useNuxtState,
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
import type { RuntimeConsentConfig } from './kernel';
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
	const requestHeaders = useNuxtState('c15t:request-headers', () =>
		pickAllowedInitHeaders(useRequestHeaders([...INIT_HEADER_NAMES]))
	);
	const headers = requestHeaders.value;
	const cookieHeader =
		typeof document === 'undefined'
			? useRequestHeaders(['cookie']).cookie
			: document.cookie;
	const initFetchTarget = getNuxtInitFetchTarget(config.value);
	const manifestMode = resolveManifestMode(config.value);
	const initialRecords = useNuxtState('c15t:records', () =>
		readStoredRecordsFromCookieHeader(
			cookieHeader,
			config.value.storageConfig,
			Date.now()
		)
	);

	const producerContract = useNuxtState<number | null | undefined>(
		'c15t:producer-contract',
		() => undefined
	);
	let prefetch: InitOutput | undefined;
	if (initFetchTarget) {
		const { data } = await useFetch<InitOutput>(initFetchTarget.url, {
			baseURL: initFetchTarget.baseURL,
			cache: manifestMode === 'server' ? undefined : 'no-store',
			headers: { ...c15tProtocolHeaders, ...headers },
			key: 'c15t:init',
			onResponse({ response }) {
				const value = response.headers.get(C15T_POLICY_CONTRACT_HEADER);
				if (value === null) {
					producerContract.value = undefined;
				} else if (/^\d+$/u.test(value.trim())) {
					producerContract.value = Number.parseInt(value.trim(), 10);
				} else {
					producerContract.value = null;
				}
			},
		});
		prefetch = data.value ?? undefined;
	}

	nuxtApp.vueApp.provide(consentConfigKey, config);

	const context = createVueConsentKernelContext({
		config: config.value as ConsentConfig,
		headers,
		initialRecords: initialRecords.value,
		prefetch,
		producerContract: producerContract.value,
	});

	nuxtApp.vueApp.provide(symbolKernelContext, context);
	nuxtApp.vueApp.provide(symbolKernel, context.kernel);
	nuxtApp.vueApp.provide(symbolSnapshot, context.snapshot);
	nuxtApp.vueApp.provide(symbolInit, context.init);
	nuxtApp.vueApp.provide(symbolActiveUI, context.activeUI);
	nuxtApp.vueApp.provide(symbolConsent, context.storedConsent);
	let disposeRuntime = () => context.dispose();
	if (typeof window !== 'undefined') {
		nuxtApp.hook('app:mounted', () => {
			disposeRuntime = startVueConsentRuntime(
				context,
				config.value as ConsentConfig,
				{ runInit: !prefetch }
			);
		});
	}
	nuxtApp.vueApp.onUnmount(() => disposeRuntime());
});
