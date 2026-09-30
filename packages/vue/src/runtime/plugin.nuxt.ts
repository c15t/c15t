import {
	deferInitGvl,
	C15T_POLICY_CONTRACT_HEADER,
	c15tProtocolHeaders,
} from '@c15t/core';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import {
	CONSENT_EXPERIMENT_HEADER,
	formatExperimentHeader,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import { defu } from 'defu';
import { computed } from 'vue';

import {
	defineNuxtPlugin,
	useAppConfig,
	useFetch,
	useHead,
	useRequestEvent,
	useRequestHeaders,
	useRuntimeConfig,
	useState as useNuxtState,
} from '#imports';

import {
	applyColorScheme,
	buildColorSchemeScript,
	COLOR_SCHEME_SCRIPT_KEY,
} from './color-scheme';
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
import {
	C15T_TIMEOUT_HEADER,
	resolveManifestMode,
	resolveNuxtTimeoutMs,
} from './manifest';
import { isSharedNuxtRender } from './shared-render';
import { generateTokensCSS, TOKENS_STYLE_ID } from './theme-tokens';
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
	// Tokens go in the head from the plugin, so the server HTML carries them
	// for the first paint and composed surfaces without ConsentRoot get
	// them too. The color scheme script sets `c15t-dark` in `<head>`, before
	// the server-rendered banner paints. Registered before the first await,
	// while the Nuxt context is still current.
	useHead(
		computed(() => {
			const { colorScheme, nonce, theme, tokens } = config.value;
			const style: Record<string, string> = {
				id: TOKENS_STYLE_ID,
				innerHTML: generateTokensCSS(tokens, { colorScheme, theme }),
				key: TOKENS_STYLE_ID,
			};
			if (nonce) {
				style.nonce = nonce;
			}
			const script: { innerHTML: string; key: string; nonce?: string }[] = [];
			const scriptSource = buildColorSchemeScript(colorScheme);
			if (scriptSource) {
				const tag: (typeof script)[number] = {
					innerHTML: scriptSource,
					key: COLOR_SCHEME_SCRIPT_KEY,
				};
				if (nonce) {
					tag.nonce = nonce;
				}
				script.push(tag);
			}
			return { script, style: [style] };
		})
	);
	// The client keeps the class right after the first paint: it follows
	// the system setting, or a site's `dark` class, as they change.
	const releaseColorScheme =
		typeof window === 'undefined'
			? () => undefined
			: applyColorScheme(config.value.colorScheme);
	// HTML that is prerendered or cached is served to every visitor, so it
	// must carry nobody's consent, location or request headers. The server
	// decides once and the payload tells the browser, which then resolves
	// the visitor itself, as on a first visit without a server render.
	const sharedRender = useNuxtState('c15t:shared-render', () =>
		isSharedNuxtRender({
			eventContext:
				typeof window === 'undefined' ? useRequestEvent()?.context : undefined,
			prerenderedAt: nuxtApp.payload.prerenderedAt,
		})
	);
	const shared = sharedRender.value;
	const requestHeaders = useNuxtState(
		'c15t:request-headers',
		(): Record<string, string> =>
			shared
				? {}
				: pickAllowedInitHeaders(useRequestHeaders([...INIT_HEADER_NAMES]))
	);
	const headers = requestHeaders.value;
	const initFetchTarget = getNuxtInitFetchTarget(config.value);
	const manifestMode = resolveManifestMode(config.value);
	const initialRecords = useNuxtState('c15t:records', () =>
		config.value.consentSource || shared
			? undefined
			: readStoredRecordsFromCookieHeader(
					typeof document === 'undefined'
						? useRequestHeaders(['cookie']).cookie
						: document.cookie,
					config.value.storageConfig,
					Date.now()
				)
	);

	const producerContract = useNuxtState<number | null | undefined>(
		'c15t:producer-contract',
		() => undefined
	);
	let prefetch: InitOutput | undefined;
	if (initFetchTarget && !config.value.consentSource && !shared) {
		// The render waits at most `timeoutMs` for policy. The same-origin init
		// route runs in-process, where an abort signal does not reach it, so it
		// is told the budget in a header; an absolute backend `/init` is a real
		// request and `timeout` aborts it. The browser's own request waits.
		const timeoutMs =
			typeof window === 'undefined'
				? resolveNuxtTimeoutMs(config.value)
				: undefined;
		const budgetHeaders: Record<string, string> =
			timeoutMs !== undefined && manifestMode === 'server'
				? { [C15T_TIMEOUT_HEADER]: String(timeoutMs) }
				: {};
		// The render's `/init` is the only one this page makes, so it carries
		// a fixed experiment arm while the visitor has no stored choice.
		const { experiment } = config.value;
		if (experiment?.arm !== undefined && !initialRecords.value?.choice) {
			budgetHeaders[CONSENT_EXPERIMENT_HEADER] = formatExperimentHeader({
				arm: experiment.arm,
				id: experiment.id,
			});
		}
		const { data } = await useFetch<InitOutput>(initFetchTarget.url, {
			baseURL: initFetchTarget.baseURL,
			cache: manifestMode === 'server' ? undefined : 'no-store',
			headers: { ...c15tProtocolHeaders, ...headers, ...budgetHeaders },
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
			timeout: timeoutMs,
			transform: (payload) =>
				deferInitGvl(
					payload,
					`${initFetchTarget.baseURL?.replace(/\/$/u, '') ?? ''}${initFetchTarget.url}`,
					'init',
					headers
				),
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
	nuxtApp.vueApp.onUnmount(() => {
		disposeRuntime();
		releaseColorScheme();
	});
});
