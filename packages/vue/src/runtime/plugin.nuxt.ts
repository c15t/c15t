import type { ConsentMode } from '@c15t/core/modes';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import { clientMode } from '@c15t/core/runtime/client-mode';
import type { RequestConsentState } from '@c15t/core/server';
import { defu } from 'defu';
import { computed, markRaw, toRaw, watch } from 'vue';

import clientManifestSnapshot from '#c15t/client-manifest-snapshot';
import {
	defineNuxtPlugin,
	showError,
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
	INIT_HEADER_NAMES,
	pickAllowedInitHeaders,
	provideVueConsentContext,
} from './kernel';
import type { RuntimeConsentConfig, VueConsentKernelContext } from './kernel';
import {
	readNuxtMode,
	readNuxtRoutePrefix,
	resolvesOnServer,
} from './nuxt-mode';
import type { NuxtConsentModeConfig } from './nuxt-mode';
import { isSharedNuxtRender } from './shared-render';
import { generateTokensCSS, TOKENS_STYLE_ID } from './theme-tokens';

/**
 * Development only: after the first init, warn when the `/init` request the
 * page's HTML started (see `server/init-prefetch.ts`) is still unused. The
 * app asked with other inputs than the server expected, so the page sent
 * two requests.
 */
const warnUnusedInitPrefetch = function warnUnusedInitPrefetch(
	context: Pick<VueConsentKernelContext, 'kernel'>
): void {
	const stop = context.kernel.events.on('command:init:completed', () => {
		stop();
		// The key core's prefetch script stores its requests under.
		const pending = (window as { __c15tInitialDataPromises?: object })
			.__c15tInitialDataPromises;
		if (pending && Object.keys(pending).length > 0) {
			// oxlint-disable-next-line no-console -- Development-only diagnostic.
			console.warn(
				"[c15t] This page's HTML started an /init request that the app did not use, so it sent its own. A client plugin probably changed c15t's config for this route: set `routeRules: { '<route>': { c15t: { initPrefetch: false } } }`."
			);
		}
	});
};

/**
 * The mode the browser runs: browser resolution gets the snapshot the
 * build bundled for it, and `hosted()` forwards the consent headers the
 * server read from the request (a CDN's country, for example) to `/init`.
 */
const withClientData = function withClientData(
	mode: ConsentMode,
	headers: Record<string, string>
): ConsentMode {
	if (mode.type === 'manifest' && mode.resolve === 'browser') {
		return clientManifestSnapshot && !mode.snapshot
			? { ...mode, snapshot: clientManifestSnapshot, source: undefined }
			: mode;
	}
	if (mode.type === 'hosted' && Object.keys(headers).length > 0) {
		return { ...mode, headers: { ...headers, ...mode.headers } };
	}
	return mode;
};

export default defineNuxtPlugin(async (nuxtApp) => {
	const appConfig = useAppConfig();
	const runtimeConfig = useRuntimeConfig();
	const config = computed(() => {
		const merged = defu(
			appConfig.c15t,
			runtimeConfig.public.c15t
		) as Partial<RuntimeConsentConfig>;
		// `defu` skips `null`, so an app config `colorScheme: null` would fall
		// back to the module options. Nitro replaces `null` in runtime config
		// with `''` during the build, so a module option `colorScheme: null`
		// arrives as `''`. Both leave `c15t-dark` to the site.
		if (
			appConfig.c15t?.colorScheme === null ||
			(merged.colorScheme as string | null | undefined) === ''
		) {
			merged.colorScheme = null;
		}
		return merged;
	});
	// `mode` and `routePrefix` come from `nuxt.config.ts` only: the build
	// decided from them what the client bundle and the server routes hold.
	const modeConfig = runtimeConfig.public.c15t as NuxtConsentModeConfig;
	const mode = readNuxtMode(modeConfig);
	const routePrefix = readNuxtRoutePrefix(modeConfig);
	const serverResolves = resolvesOnServer(mode);
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
		serverResolves &&
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
		const state = await resolveNuxtConsent(
			{ ...config.value, mode, routePrefix: routePrefix ?? false },
			request
		);
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

	// One runtime per app. Payload state is deep-reactive; the kernel gets
	// the plain objects. An `iab` policy without `iab` throws from here when
	// the server resolved it, and Nuxt renders its error page. A policy the
	// browser resolves (`ssr: false`, a prerendered page) shows the same
	// error page from the client.
	const context = createVueConsentKernelContext({
		config: config.value as ConsentConfig,
		headers,
		host: 'nuxt',
		initialRecords: initialRecords.value
			? toRaw(initialRecords.value)
			: undefined,
		mode: clientMode(withClientData(mode, headers), {
			backendURL: config.value.backendURL,
			routePrefix,
		}),
		onIABUnavailable: (error) => {
			// The error page alone writes nothing to the console.
			console.error(error);
			void nuxtApp.runWithContext(() => showError(error));
		},
		prefetchState: hasPrefetch ? prefetch : undefined,
	});
	provideVueConsentContext(nuxtApp.vueApp, context);

	if (typeof window !== 'undefined') {
		if (nuxtApp.payload.serverRendered || !serverResolves) {
			// Start after hydration, so the first client render matches the
			// server's HTML. Browser resolution also starts here: its
			// manifest and resolver requests left when the runtime was built,
			// so starting earlier would only put work in front of the mount.
			nuxtApp.hook('app:mounted', () => context.start());
		} else {
			// No server markup to match (`ssr: false`): start now, so `/init`
			// overlaps the mount instead of waiting for it.
			context.start();
		}
		if ((import.meta as ImportMeta & { dev?: boolean }).dev) {
			warnUnusedInitPrefetch(context);
		}
		// App config can change at runtime (`updateAppConfig`, HMR). The
		// runtime applies what changed.
		watch(config, (next) => context.update(next as RuntimeConsentConfig));
	}
	nuxtApp.vueApp.onUnmount(() => {
		context.dispose();
		releaseColorScheme();
	});
});
