import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import type { RequestConsentState } from '@c15t/core/server';
import { defu } from 'defu';
import { computed, markRaw, toRaw } from 'vue';

import {
	defineNuxtPlugin,
	useAppConfig,
	useHead,
	useRequestEvent,
	useRequestHeaders,
	useRequestURL,
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
	const config = computed(() => {
		const merged = defu(
			appConfig.c15t,
			runtimeConfig.public.c15t
		) as Partial<RuntimeConsentConfig>;
		// `defu` skips `null`, so an app config `colorScheme: null` would fall
		// back to the module options. `null` leaves `c15t-dark` to the site.
		if (appConfig.c15t?.colorScheme === null) {
			merged.colorScheme = null;
		}
		return merged;
	});
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

	// The render resolves the visitor's consent once, on the server, and the
	// payload carries the state to the browser. `import.meta.server` keeps
	// the resolver, and the translations it bundles, out of the client build.
	const prefetched = useNuxtState<RequestConsentState | undefined>(
		'c15t:consent',
		() => undefined
	);
	if (
		// Nuxt replaces `import.meta.server` at build time, so the client build
		// drops this branch; elsewhere (unit tests) a missing `window` decides.
		((import.meta as ImportMeta & { server?: boolean }).server ??
			typeof window === 'undefined') &&
		initFetchTarget &&
		!config.value.consentSource &&
		!shared
	) {
		// Read before the first await, while the Nuxt context is current.
		const request = {
			event: useRequestEvent(),
			headers: useRequestHeaders(),
			url: useRequestURL(),
		};
		const { resolveNuxtConsent } = await import('./server-consent');
		const state = await resolveNuxtConsent(config.value, request);
		// Only a resolved policy is worth the payload bytes; without one the
		// browser runs init, and the records travel in `c15t:records`.
		if (state.initialPolicyResolution !== undefined) {
			// The cookie's records and clock already travel in `c15t:records`;
			// only a subject the backend named is new.
			const { initialRecords: records, now: _now, ...rest } = state;
			const subject = records?.subject;
			// Raw: the state holds frozen policy objects, which a reactive
			// payload proxy cannot wrap.
			prefetched.value = markRaw(
				subject ? { ...rest, initialRecords: { subject } } : rest
			);
		}
	}
	const prefetch = prefetched.value ? toRaw(prefetched.value) : undefined;
	const hasPrefetch = prefetch?.initialPolicyResolution !== undefined;

	nuxtApp.vueApp.provide(consentConfigKey, config);

	const context = createVueConsentKernelContext({
		config: config.value as ConsentConfig,
		headers,
		initialRecords: initialRecords.value,
		prefetchState: hasPrefetch ? prefetch : undefined,
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
				{ runInit: !hasPrefetch }
			);
		});
	}
	nuxtApp.vueApp.onUnmount(() => {
		disposeRuntime();
		releaseColorScheme();
	});
});
