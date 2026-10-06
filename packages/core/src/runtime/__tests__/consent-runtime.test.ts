import { resolvePolicyRules } from '@c15t/schema/types';
import { enTranslations } from '@c15t/translations';
import { baseTranslations } from '@c15t/translations/all';
/**
 * @vitest-environment jsdom
 *
 * `createConsentRuntime` — construction, `start()`, `dispose()`.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createIframeBlocker } from '../../modules/iframe-blocker';
import { createNetworkBlocker } from '../../modules/network-blocker';
import { holdNetworkRequests } from '../../modules/network-blocker/hold';
import { createPersistence } from '../../modules/persistence';
import { createScriptLoader } from '../../modules/script-loader';
import { resolveLocalTranslations } from '../../translations';
import { custom } from '../../transports/mode';
import { offline } from '../../transports/offline';
import type { KernelTransport } from '../../types';
import {
	createConsentProviderRuntime,
	createConsentRuntime,
	defaultRuntimeModules,
	lazyRuntimeModule,
} from '../index';
import { createRuntimeKernel, hasResolvedPrefetch } from '../runtime-kernel';
import type { ConsentRuntimeIABHandle } from '../types';

const createTransport = function createTransport(
	overrides: Partial<KernelTransport> = {}
): KernelTransport {
	return {
		init: vi.fn().mockResolvedValue({}),
		save: vi.fn().mockResolvedValue({ ok: true }),
		...overrides,
	};
};

const createIABHandle = function createIABHandle(): ConsentRuntimeIABHandle {
	return {
		acceptAll: vi.fn(),
		dispose: vi.fn(),
		generateTCString: vi.fn().mockResolvedValue(''),
		rejectAll: vi.fn(),
		save: vi.fn().mockResolvedValue(undefined),
		setPurposeConsent: vi.fn(),
		setPurposeLegitimateInterest: vi.fn(),
		setSpecialFeatureOptIn: vi.fn(),
		setVendorConsent: vi.fn(),
		setVendorLegitimateInterest: vi.fn(),
	};
};

/**
 * Expires every cookie the document currently carries. Assigning an empty
 * string to `document.cookie` sets a cookie rather than clearing any, so a
 * consent cookie one test wrote would hydrate the next one's runtime.
 */
const clearCookies = function clearCookies(): void {
	for (const pair of document.cookie.split(';')) {
		const name = pair.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(() => {
	localStorage.clear();
	clearCookies();
});

afterEach(() => {
	vi.restoreAllMocks();
	delete (window as { c15t?: unknown }).c15t;
});

const RESOLVED_PREFETCH = {
	initialPolicyResolution: resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				id: 'policy_1',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	}),
};

describe('hasResolvedPrefetch', () => {
	test('requires a resolution with no pending marker', () => {
		expect(hasResolvedPrefetch(undefined)).toBe(false);
		expect(hasResolvedPrefetch({})).toBe(false);
		expect(hasResolvedPrefetch({ initialPolicyPending: true })).toBe(false);
		expect(hasResolvedPrefetch(RESOLVED_PREFETCH)).toBe(true);
		expect(
			hasResolvedPrefetch({
				...(RESOLVED_PREFETCH as object),
				initialPolicyPending: true,
			} as never)
		).toBe(false);
	});
});

describe('createRuntimeKernel', () => {
	test('withholds an unfiltered reference summary before runtime mount', () => {
		const gvlReference = {
			language: 'en',
			summary: { items: ['Storage'], vendorCount: 100 },
			url: '/vendor-list',
			vendorListVersion: 42,
		};
		const kernel = createRuntimeKernel({
			iab: { cmpId: 28, vendors: [1] },
			mode: custom(createTransport()),
			prefetch: {
				...RESOLVED_PREFETCH,
				initialIab: { enabled: true, gvl: null, gvlReference },
			},
		});
		expect(kernel.getServerSnapshot().iab?.gvlReference).toEqual({
			...gvlReference,
			summary: undefined,
		});
		expect(gvlReference.summary.vendorCount).toBe(100);
		kernel.dispose();
	});

	test('throws when `mode` is not a transport factory', () => {
		expect(() =>
			createRuntimeKernel({ mode: undefined as never })
		).toThrowError(/`mode` is required/u);
	});

	test('merges prefetched backend vendors with code-declared ones and keeps the list version', () => {
		const kernel = createRuntimeKernel({
			mode: custom(createTransport()),
			prefetch: {
				...RESOLVED_PREFETCH,
				initialVendors: {
					declared: [
						{
							category: 'measurement',
							id: 'google-analytics',
							name: 'Google Analytics',
							presentable: true,
							privacyPolicyUrl: 'https://policies.google.com/privacy',
							source: 'manifest',
						},
					],
					listVersion: '2026-09',
				},
			},
			scripts: [
				{
					category: 'marketing',
					id: 'meta',
					src: 'https://example.com/meta.js',
					vendor: 'meta-pixel',
				},
			],
			vendors: [
				{
					category: 'marketing',
					id: 'meta-pixel',
					name: 'Meta Pixel',
					privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
				},
			],
		});
		const { vendors, consentCategories } = kernel.getServerSnapshot();
		expect(vendors?.listVersion).toBe('2026-09');
		expect(vendors?.declared.map((vendor) => vendor.id)).toEqual([
			'google-analytics',
			'meta-pixel',
		]);
		// The prefetched backend vendor's category is selectable at construction,
		// so the server snapshot and the hydrated one agree on scope.
		expect(consentCategories).toContain('measurement');
	});

	test('a disabled runtime ignores a prefetched vendor denial', () => {
		const kernel = createRuntimeKernel({
			enabled: false,
			mode: custom(createTransport()),
			prefetch: {
				...RESOLVED_PREFETCH,
				initialRecords: {
					now: 1_800_000_000_000,
					vendorChoice: {
						confirmedAt: 1_799_999_999_000,
						denied: ['meta-pixel'],
						version: 1,
					},
				},
			},
		});
		expect(kernel.getServerSnapshot().vendorChoice).toBeNull();
	});

	test('grants every category and suppresses UI when disabled', () => {
		const kernel = createRuntimeKernel({
			enabled: false,
			mode: custom(createTransport()),
		});

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(kernel.getSnapshot().policyRule.id).toBe('disabled');
	});

	test('merges provider overrides over prefetched overrides', () => {
		const kernel = createRuntimeKernel({
			mode: custom(createTransport()),
			overrides: { country: 'DE' },
			prefetch: { initialOverrides: { country: 'US', language: 'fr' } },
		});

		expect(kernel.getSnapshot().overrides).toMatchObject({
			country: 'DE',
			language: 'fr',
		});
	});

	test('normalizes a v2 `{ id }` user into `{ externalId }`', () => {
		const kernel = createRuntimeKernel({
			mode: custom(createTransport()),
			user: { id: 'user_1', identityProvider: 'auth0' },
		});

		expect(kernel.getSnapshot().user).toMatchObject({
			externalId: 'user_1',
			identityProvider: 'auth0',
		});
	});
});

describe('app i18n over backend translations', () => {
	const backendEnglish = {
		language: 'en',
		translations: {
			...enTranslations,
			cookieBanner: {
				...enTranslations.cookieBanner,
				description: 'Backend description',
				title: 'Backend title',
			},
		},
	} as never;
	const appI18n = {
		messages: { en: { cookieBanner: { title: 'App title' } } },
	} as never;

	test('an app override survives a hosted init for the same language', async () => {
		const transport = createTransport({
			init: vi.fn().mockResolvedValue({
				...RESOLVED_PREFETCH,
				translations: backendEnglish,
			}),
		});
		const kernel = createRuntimeKernel({
			i18n: appI18n,
			mode: custom(transport),
		});

		await kernel.commands.init();

		const copy = kernel.getSnapshot().translations?.translations;
		expect(copy?.cookieBanner.title).toBe('App title');
		// Keys the app did not override keep the backend's copy.
		expect(copy?.cookieBanner.description).toBe('Backend description');
		kernel.dispose();
	});

	test('an app override survives a server prefetch for the same language', () => {
		const kernel = createRuntimeKernel({
			i18n: appI18n,
			mode: custom(createTransport()),
			prefetch: { ...RESOLVED_PREFETCH, initialTranslations: backendEnglish },
		});

		const copy = kernel.getServerSnapshot().translations?.translations;
		expect(copy?.cookieBanner.title).toBe('App title');
		expect(copy?.cookieBanner.description).toBe('Backend description');
		kernel.dispose();
	});

	test('a regional backend language takes the overrides for its primary language', async () => {
		const transport = createTransport({
			init: vi.fn().mockResolvedValue({
				...RESOLVED_PREFETCH,
				translations: { language: 'de-AT', translations: enTranslations },
			}),
		});
		const kernel = createRuntimeKernel({
			i18n: {
				messages: { de: { cookieBanner: { title: 'Kekse' } } },
			} as never,
			mode: custom(transport),
		});

		await kernel.commands.init();

		expect(
			kernel.getSnapshot().translations?.translations.cookieBanner.title
		).toBe('Kekse');
		kernel.dispose();
	});

	test('overrides for another language do not leak into the copy', async () => {
		const transport = createTransport({
			init: vi.fn().mockResolvedValue({
				...RESOLVED_PREFETCH,
				translations: backendEnglish,
			}),
		});
		const kernel = createRuntimeKernel({
			i18n: {
				messages: { de: { cookieBanner: { title: 'Kekse' } } },
			} as never,
			mode: custom(transport),
		});

		await kernel.commands.init();

		expect(
			kernel.getSnapshot().translations?.translations.cookieBanner.title
		).toBe('Backend title');
		kernel.dispose();
	});
});

describe('stock bundles passed as i18n messages', () => {
	const stockGerman = baseTranslations.de;
	const hostedGerman = (translations: Record<string, unknown>) =>
		custom(
			createTransport({
				init: vi.fn().mockResolvedValue({
					...RESOLVED_PREFETCH,
					translations: { language: 'de', translations },
				}),
			})
		);

	test('a backend edit shows when the app passes the stock bundle', async () => {
		const kernel = createRuntimeKernel({
			i18n: { locale: 'de', messages: { de: { ...stockGerman } } } as never,
			mode: hostedGerman({
				...stockGerman,
				cookieBanner: { ...stockGerman.cookieBanner, title: 'Vom Backend' },
			}),
		});

		await kernel.commands.init();

		expect(
			kernel.getSnapshot().translations?.translations.cookieBanner.title
		).toBe('Vom Backend');
		kernel.dispose();
	});

	test('a customized key still wins over the backend', async () => {
		const kernel = createRuntimeKernel({
			i18n: {
				locale: 'de',
				messages: {
					de: {
						...stockGerman,
						cookieBanner: {
							...stockGerman.cookieBanner,
							title: 'Eigener Titel',
						},
					},
				},
			} as never,
			mode: hostedGerman({
				...stockGerman,
				cookieBanner: {
					...stockGerman.cookieBanner,
					description: 'Vom Backend',
				},
			}),
		});

		await kernel.commands.init();

		const copy = kernel.getSnapshot().translations?.translations;
		expect(copy?.cookieBanner.title).toBe('Eigener Titel');
		expect(copy?.cookieBanner.description).toBe('Vom Backend');
		kernel.dispose();
	});

	test('keys the backend does not supply keep the app copy in full', async () => {
		const kernel = createRuntimeKernel({
			i18n: { locale: 'de', messages: { de: { ...stockGerman } } } as never,
			mode: hostedGerman({}),
		});

		await kernel.commands.init();

		const copy = kernel.getSnapshot().translations?.translations;
		expect(copy?.cookieBanner.title).toBe(stockGerman.cookieBanner.title);
		expect(copy?.common.acceptAll).toBe(stockGerman.common.acceptAll);
		kernel.dispose();
	});
});

describe('offline copy with every bundled language loaded', () => {
	test('a regional language resolves its primary language bundle', () => {
		const copy = resolveLocalTranslations('de-AT', undefined);

		expect(copy?.language).toBe('de-AT');
		expect(copy?.translations.cookieBanner.title).toBe(
			baseTranslations.de.cookieBanner.title
		);
	});

	test('app messages apply over the bundle for that language', () => {
		const copy = resolveLocalTranslations('fr', {
			fr: { cookieBanner: { title: 'Mon titre' } },
		});

		expect(copy?.translations.cookieBanner.title).toBe('Mon titre');
		expect(copy?.translations.common.acceptAll).toBe(
			baseTranslations.fr.common.acceptAll
		);
	});

	test('a language set through the kernel switches to the bundled copy', async () => {
		const kernel = createRuntimeKernel({ mode: offline() });
		await kernel.commands.init();

		kernel.set.language('de');
		await kernel.commands.init();

		expect(
			kernel.getSnapshot().translations?.translations.cookieBanner.title
		).toBe(baseTranslations.de.cookieBanner.title);
		kernel.dispose();
	});
});

describe('createConsentRuntime', () => {
	test('defers storage hydration until start and preserves valid legacy records', () => {
		document.cookie = `c15t=c.necessary:1,c.marketing:1,i.t:${Date.now()}; path=/`;

		const runtime = createConsentRuntime({ mode: custom(createTransport()) });

		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
		runtime.start();
		expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
			true
		);
		expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
		runtime.dispose();
	});

	test('skips early hydration when persistence is disabled', () => {
		document.cookie = `c15t=c.necessary:1,c.marketing:1,i.t:${Date.now()}; path=/`;

		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			persistence: false,
		});

		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
		runtime.dispose();
	});

	test('`start()` runs init once and is idempotent', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({ mode: custom(transport) });

		runtime.start();
		runtime.start();
		await vi.waitFor(() => {
			expect(transport.init).toHaveBeenCalledTimes(1);
		});
		expect(runtime.started).toBe(true);
		runtime.dispose();
	});

	test('`start()` with a resolved prefetch still records the first impression', () => {
		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			prefetch: RESOLVED_PREFETCH,
		});
		const shown: string[] = [];
		runtime.kernel.events.on('surface:shown', (event) =>
			shown.push(event.surface)
		);

		runtime.start();

		expect(runtime.kernel.getSnapshot().activeUI).toBe('banner');
		expect(shown).toEqual(['banner']);
		expect(runtime.kernel.getSnapshot().surfaceShownAt.banner).not.toBeNull();
		runtime.dispose();
	});

	test('`start()` skips init when the prefetch already resolved the policy', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		});

		runtime.start();
		await Promise.resolve();
		await Promise.resolve();
		expect(transport.init).not.toHaveBeenCalled();
		expect(runtime.kernel.getSnapshot().policyRule.id).toBe('policy_1');
		runtime.dispose();
	});

	test('`start()` still replays `init:applied` for a skipped init', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		});
		const applied = vi.fn();
		runtime.kernel.events.on('init:applied', applied);

		runtime.start();
		await Promise.resolve();
		expect(applied).toHaveBeenCalledTimes(1);
		runtime.dispose();
	});

	test('`start()` runs init for a prefetch without a resolved policy', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({
			mode: custom(transport),
			prefetch: { initialOverrides: { country: 'DE' } },
		});

		runtime.start();
		await vi.waitFor(() => {
			expect(transport.init).toHaveBeenCalledTimes(1);
		});
		runtime.dispose();
	});

	test('`reinit()` still calls init with a resolved prefetch', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		});

		runtime.start();
		await runtime.reinit();
		expect(transport.init).toHaveBeenCalledTimes(1);
		runtime.dispose();
	});

	test('`start()` publishes the window debug handle under the given pkg', () => {
		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			pkg: '@c15t/svelte',
		});

		runtime.start();
		expect((window as { c15t?: { pkg?: string } }).c15t?.pkg).toBe(
			'@c15t/svelte'
		);

		runtime.dispose();
		expect((window as { c15t?: unknown }).c15t).toBeUndefined();
	});

	test('does not run init or mount modules when disabled', () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({
			enabled: false,
			mode: custom(transport),
		});

		runtime.start();
		expect(transport.init).not.toHaveBeenCalled();
		runtime.dispose();
	});

	test('loads consent-gated scripts immediately when disabled', () => {
		// `enabled: false` grants every category, so the documented behaviour
		// is that gated scripts run as they would after "accept all" — not
		// that they silently never load.
		const onBeforeLoad = vi.fn();
		const runtime = createConsentRuntime({
			enabled: false,
			mode: custom(createTransport()),
			scripts: [
				{
					callbackOnly: true,
					category: 'measurement',
					id: 'measurement-callback',
					onBeforeLoad,
				},
			],
		});

		runtime.start();
		expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			true
		);
		expect(onBeforeLoad).toHaveBeenCalledOnce();
		runtime.dispose();
	});

	test('mounts IAB through the injected factory and exposes the handle', () => {
		const handle = createIABHandle();
		const createIAB = vi.fn().mockReturnValue(handle);
		const runtime = createConsentRuntime({
			createIAB,
			iab: { cmpId: 42, cmpVersion: '3' },
			mode: custom(createTransport()),
		});

		expect(runtime.iab).toBeNull();
		runtime.start();

		expect(createIAB).toHaveBeenCalledTimes(1);
		expect(createIAB.mock.calls[0]?.[0]).toMatchObject({
			cmpId: 42,
			cmpVersion: 3,
		});
		expect(runtime.iab).toBe(handle);

		runtime.dispose();
		expect(handle.dispose).toHaveBeenCalledTimes(1);
		expect(runtime.iab).toBeNull();
	});

	test('leaves IAB unmounted when no factory is injected', () => {
		const runtime = createConsentRuntime({
			iab: { cmpId: 42 },
			mode: custom(createTransport()),
		});

		runtime.start();
		expect(runtime.iab).toBeNull();
		runtime.dispose();
	});

	test('defers the IAB mount until the kernel reports a cmpId', () => {
		const handle = createIABHandle();
		const createIAB = vi.fn().mockReturnValue(handle);
		const runtime = createConsentRuntime({
			createIAB,
			iab: { enabled: true },
			mode: custom(createTransport()),
		});
		const seen: (ConsentRuntimeIABHandle | null)[] = [];
		runtime.subscribe(() => seen.push(runtime.iab));

		runtime.start();
		expect(createIAB).not.toHaveBeenCalled();

		runtime.kernel.set.iab({ cmpId: 7, enabled: true });
		expect(createIAB).toHaveBeenCalledTimes(1);
		expect(seen).toEqual([handle]);

		runtime.dispose();
	});

	test('`identify()` normalizes the user and swallows transport failures', async () => {
		const identify = vi.fn().mockRejectedValue(new Error('offline'));
		const runtime = createConsentRuntime({
			mode: custom(createTransport({ identify })),
		});

		await expect(
			runtime.identify({ id: 'user_1', identityProvider: 'auth0' })
		).resolves.toBeUndefined();
		expect(identify.mock.calls[0]?.[0]).toMatchObject({
			externalId: 'user_1',
		});

		await runtime.identify(undefined);
		expect(identify).toHaveBeenCalledTimes(1);

		runtime.dispose();
	});

	test('`reinit()` re-runs init and is inert when disabled', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({ mode: custom(transport) });

		await runtime.reinit();
		expect(transport.init).toHaveBeenCalledTimes(1);
		runtime.dispose();

		const disabledTransport = createTransport();
		const disabled = createConsentRuntime({
			enabled: false,
			mode: custom(disabledTransport),
		});
		await disabled.reinit();
		expect(disabledTransport.init).not.toHaveBeenCalled();
		disabled.dispose();
	});

	test('`setOverrides()` writes through to the kernel', () => {
		const runtime = createConsentRuntime({ mode: custom(createTransport()) });

		runtime.setOverrides({ country: 'FR' });
		expect(runtime.kernel.getSnapshot().overrides.country).toBe('FR');
		// Merged, not replaced: a key left out keeps its value.
		runtime.setOverrides({ language: 'de' });
		expect(runtime.kernel.getSnapshot().overrides).toMatchObject({
			country: 'FR',
			language: 'de',
		});
		runtime.setOverrides({ country: undefined });
		expect(runtime.kernel.getSnapshot().overrides.country).toBeUndefined();
		expect(runtime.kernel.getSnapshot().overrides.language).toBe('de');
		runtime.dispose();
	});

	test('`setConsentCategories()` replaces the configured categories', () => {
		const runtime = createConsentRuntime({
			consentCategories: ['necessary'],
			mode: custom(createTransport()),
		});

		expect(runtime.consentCategories).toEqual(['necessary']);
		runtime.setConsentCategories(['necessary', 'marketing']);
		expect(runtime.consentCategories).toEqual(['necessary', 'marketing']);
		runtime.dispose();
	});

	test('`dispose()` stops the runtime and blocks a later `start()`', () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({ mode: custom(transport) });

		runtime.start();
		runtime.dispose();
		expect(runtime.started).toBe(false);

		runtime.start();
		expect(runtime.started).toBe(false);
	});

	test('`processIframes()` scans frames when automatic blocking is off', () => {
		const iframe = document.createElement('iframe');
		iframe.setAttribute('data-category', 'marketing');
		iframe.setAttribute('src', 'https://example.com/embed');
		document.body.append(iframe);
		const runtime = createConsentRuntime({
			iframeBlocker: { disableAutomaticBlocking: true },
			mode: custom(createTransport()),
		});

		runtime.processIframes();
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');

		runtime.start();
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');
		runtime.processIframes();
		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe('https://example.com/embed');

		runtime.dispose();
		iframe.setAttribute('src', 'https://example.com/embed');
		runtime.processIframes();
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');
		iframe.remove();
	});

	test('holds network-blocker requests from construction until `start()` decides them', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const nativeFetch = window.fetch;
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as unknown as typeof window.fetch;
		try {
			const runtime = createConsentRuntime({
				mode: custom(createTransport()),
				networkBlocker: {
					rules: [{ category: 'measurement', domain: 'tracker.example' }],
				},
				prefetch: RESOLVED_PREFETCH,
			});
			// A component that mounts before the host calls `start()`.
			const early = window.fetch('https://tracker.example/collect');
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(original).not.toHaveBeenCalled();

			runtime.start();

			expect((await early).status).toBe(451);
			expect(original).not.toHaveBeenCalled();
			runtime.dispose();
		} finally {
			window.fetch = nativeFetch;
		}
	});

	test('a runtime disposed before `start()` fails its held requests closed', async () => {
		const nativeFetch = window.fetch;
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as unknown as typeof window.fetch;
		try {
			const runtime = createConsentRuntime({
				mode: custom(createTransport()),
				networkBlocker: {
					rules: [{ category: 'measurement', domain: 'tracker.example' }],
				},
				prefetch: RESOLVED_PREFETCH,
			});
			let settled = false;
			const early = window
				.fetch('https://tracker.example/collect')
				.finally(() => {
					settled = true;
				});
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(settled).toBe(false);

			runtime.dispose();

			// Nothing checked consent for the held request, so it is answered
			// as blocked rather than sent, and it does not hang.
			expect((await early).status).toBe(451);
			expect(original).not.toHaveBeenCalled();
			// The hold is gone: nothing waits from here on.
			expect(window.fetch).toBe(original);
		} finally {
			window.fetch = nativeFetch;
		}
	});

	test('forwards `i18n` messages into the kernel translations', () => {
		const runtime = createConsentRuntime({
			i18n: {
				locale: 'de',
				messages: {
					de: { cookieBanner: { title: 'Kekse' } } as never,
				},
			},
			mode: custom(createTransport()),
		});

		const { translations } = runtime.kernel.getSnapshot();
		expect(translations?.language).toBe('de');
		expect(translations?.translations.cookieBanner.title).toBe('Kekse');
		expect(translations?.translations.common.save).toBeTruthy();
		runtime.dispose();
	});

	test('a locale on its own still selects that language', () => {
		const runtime = createConsentRuntime({
			i18n: { locale: 'de' },
			mode: custom(createTransport()),
		});

		// `@c15t/core` bundles English only, so the copy stays English until
		// the backend or a `messages` override supplies German. The language
		// is what travels to `/init`, and it has to be the one asked for.
		const { translations } = runtime.kernel.getSnapshot();
		expect(translations?.language).toBe('de');
		expect(translations?.translations.common.save).toBeTruthy();
		runtime.dispose();
	});

	test('reinit after dispose does not touch the kernel', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({ mode: custom(transport) });

		runtime.start();
		await vi.waitFor(() => expect(transport.init).toHaveBeenCalled());
		const callsBeforeDispose = (transport.init as ReturnType<typeof vi.fn>).mock
			.calls.length;

		runtime.dispose();
		await runtime.reinit();

		expect(transport.init).toHaveBeenCalledTimes(callsBeforeDispose);
	});
});

describe('windowDebug', () => {
	type DebugWindow = Window & { c15t?: unknown };

	afterEach(() => {
		(window as DebugWindow).c15t = undefined;
	});

	test('installs the debug object on start by default', () => {
		const runtime = createConsentRuntime({ mode: custom(createTransport()) });

		runtime.start();

		expect((window as DebugWindow).c15t).toMatchObject({ mode: 'custom' });
		runtime.dispose();
	});

	test('leaves window.c15t alone when turned off', () => {
		const owned = { mine: true };
		(window as DebugWindow).c15t = owned;
		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			windowDebug: false,
		});

		runtime.start();
		expect((window as DebugWindow).c15t).toBe(owned);

		runtime.dispose();
		expect((window as DebugWindow).c15t).toBe(owned);
	});
});

describe('the runtime network hold', () => {
	const settles = (request: Promise<Response>) => {
		const state = { settled: false };
		void request.finally(() => {
			state.settled = true;
		});
		return state;
	};
	const tick = () =>
		new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});

	test("disposing before `start()` fails only this runtime's held requests closed", async () => {
		const nativeFetch = window.fetch;
		const network = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = network as unknown as typeof window.fetch;
		// Another caller, such as a component, holds its own rules.
		const other = holdNetworkRequests([
			{ category: 'marketing', domain: 'ads.example' },
		]);
		try {
			const runtime = createConsentRuntime({
				mode: custom(createTransport()),
				networkBlocker: {
					rules: [{ category: 'measurement', domain: 'tracker.example' }],
				},
				prefetch: RESOLVED_PREFETCH,
			});
			const own = window.fetch('https://tracker.example/collect');
			const ads = settles(window.fetch('https://ads.example/pixel'));
			await tick();

			runtime.dispose();

			// Nothing checked consent for it: answered as blocked, not sent.
			expect((await own).status).toBe(451);
			expect(network).not.toHaveBeenCalled();
			await tick();
			expect(ads.settled).toBe(false);
		} finally {
			other.release()();
			window.fetch = nativeFetch;
		}
	});

	test('a disabled blocker leaves other callers holding', async () => {
		const nativeFetch = window.fetch;
		const network = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = network as unknown as typeof window.fetch;
		const other = holdNetworkRequests([
			{ category: 'marketing', domain: 'ads.example' },
		]);
		try {
			const runtime = createConsentRuntime({
				mode: custom(createTransport()),
				networkBlocker: {
					enabled: false,
					rules: [{ category: 'marketing', domain: 'ads.example' }],
				},
				prefetch: RESOLVED_PREFETCH,
			});
			const ads = settles(window.fetch('https://ads.example/pixel'));
			await tick();

			runtime.start();
			await tick();

			// The disabled blocker's pass-through would send it unchecked.
			expect(ads.settled).toBe(false);
			expect(network).not.toHaveBeenCalledWith(
				'https://ads.example/pixel',
				undefined
			);
			runtime.dispose();
		} finally {
			other.release()();
			window.fetch = nativeFetch;
		}
	});

	describe('a blocker whose chunk fails to load', () => {
		const RULES = [{ category: 'measurement', domain: 'tracker.example' }];
		/** A lazy blocker whose chunk fails until `recover()` is called. */
		const failingBlocker = function failingBlocker() {
			let recovered = false;
			const loads = { count: 0 };
			const lazyBlocker = lazyRuntimeModule(() => {
				loads.count += 1;
				return recovered
					? Promise.resolve(createNetworkBlocker)
					: Promise.reject<typeof createNetworkBlocker>(
							new Error('chunk failed to load')
						);
			});
			return {
				createNetworkBlocker: lazyBlocker,
				loads,
				recover: () => {
					recovered = true;
				},
			};
		};
		const startWith = function startWith(
			createBlocker: ReturnType<typeof failingBlocker>['createNetworkBlocker']
		) {
			return createConsentProviderRuntime(
				{
					mode: custom(createTransport()),
					networkBlocker: { rules: RULES as never },
					persistence: false,
					prefetch: RESOLVED_PREFETCH,
				},
				{ ...defaultRuntimeModules, createNetworkBlocker: createBlocker }
			);
		};

		test('answers held and later matching requests as blocked, without sending them', async () => {
			const nativeFetch = window.fetch;
			const network = vi.fn(() => Promise.resolve(new Response('ok')));
			window.fetch = network as unknown as typeof window.fetch;
			try {
				const blocker = failingBlocker();
				const runtime = startWith(blocker.createNetworkBlocker);
				const held = window.fetch('https://tracker.example/collect');
				const early = settles(held);
				runtime.start();
				await vi.waitFor(() => {
					expect(blocker.loads.count).toBe(1);
				});
				await tick();

				// Settled the way the blocker answers a blocked request, not
				// left pending for the life of the page.
				expect(early.settled).toBe(true);
				expect((await held).status).toBe(451);
				const later = window.fetch('https://tracker.example/collect');
				const late = settles(later);
				await tick();
				expect(late.settled).toBe(true);
				expect((await later).status).toBe(451);
				expect(network).not.toHaveBeenCalled();

				// Requests no rule matches go out as usual.
				await window.fetch('https://cdn.example/app.js');
				expect(network).toHaveBeenCalledOnce();
				runtime.dispose();
				// Disposing ends the hold.
				expect(window.fetch).toBe(network);
			} finally {
				window.fetch = nativeFetch;
			}
		});

		test('takes over once a later load lands, when the browser is back online', async () => {
			const nativeFetch = window.fetch;
			const network = vi.fn(() => Promise.resolve(new Response('ok')));
			window.fetch = network as unknown as typeof window.fetch;
			try {
				const blocker = failingBlocker();
				const runtime = startWith(blocker.createNetworkBlocker);
				runtime.start();
				await vi.waitFor(() => {
					expect(blocker.loads.count).toBe(1);
				});
				await tick();
				await runtime.kernel.commands.save({ measurement: true });
				// Granted, but nothing can check it: still blocked.
				expect(
					(await window.fetch('https://tracker.example/collect')).status
				).toBe(451);

				blocker.recover();
				window.dispatchEvent(new Event('online'));
				await vi.waitFor(() => {
					expect(blocker.loads.count).toBe(2);
				});
				await tick();

				// The blocker decides now: measurement is granted.
				await window.fetch('https://tracker.example/collect');
				expect(network).toHaveBeenCalledWith(
					'https://tracker.example/collect',
					undefined
				);
				runtime.dispose();
			} finally {
				window.fetch = nativeFetch;
			}
		});
	});
});

describe('revocation reload', () => {
	const revoke = async function revoke(
		options: { reloadOnConsentRevoked?: boolean } = {}
	) {
		vi.useFakeTimers();
		const reload = vi.fn();
		vi.spyOn(window, 'location', 'get').mockReturnValue({
			reload,
		} as unknown as Location);
		const onBeforeConsentRevocationReload = vi.fn();
		const runtime = createConsentRuntime({
			callbacks: { onBeforeConsentRevocationReload },
			mode: custom(createTransport()),
			prefetch: RESOLVED_PREFETCH,
			...options,
		});
		const settle = async (saving: Promise<unknown>) => {
			await vi.advanceTimersByTimeAsync(10);
			await saving;
			await vi.advanceTimersByTimeAsync(10);
		};
		await settle(runtime.kernel.commands.save({ marketing: true }));
		await settle(runtime.kernel.commands.save({ marketing: false }));
		runtime.dispose();
		vi.useRealTimers();
		return { onBeforeConsentRevocationReload, reload };
	};

	test('reloads by default after an explicit revocation', async () => {
		const { onBeforeConsentRevocationReload, reload } = await revoke();
		expect(onBeforeConsentRevocationReload).toHaveBeenCalledOnce();
		expect(reload).toHaveBeenCalledOnce();
	});

	test('honours `reloadOnConsentRevoked: false`', async () => {
		const { onBeforeConsentRevocationReload, reload } = await revoke({
			reloadOnConsentRevoked: false,
		});
		expect(onBeforeConsentRevocationReload).not.toHaveBeenCalled();
		expect(reload).not.toHaveBeenCalled();
	});
});

/**
 * One lifecycle in core. Where React's provider, Vue's kernel and Svelte's
 * context had their own copies, these pin the behaviour the runtime keeps.
 */
describe('lifecycle verbs', () => {
	const choice = {
		categories: {
			marketing: {
				basis: { kind: 'legacy-v2' as const },
				confirmedAt: 1,
				value: false,
			},
		},
		version: 3 as const,
	};

	test('`clearRecords()` without persistence clears every record, vendors included, and announces it', () => {
		// Vue's copy left `vendorChoice` behind, so a cleared visitor kept
		// their vendor denials.
		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			persistence: false,
			prefetch: {
				...RESOLVED_PREFETCH,
				initialRecords: {
					choice,
					subject: { subjectId: 'sub_1' },
					vendorChoice: { confirmedAt: 1, denied: ['ads'], version: 1 },
				},
				now: 2,
			},
		});
		const cleared = vi.fn();
		runtime.kernel.events.on('records:cleared', cleared);

		runtime.clearRecords();

		const snapshot = runtime.kernel.getSnapshot();
		expect(snapshot.explicitChoice).toBeNull();
		expect(snapshot.subject).toBeNull();
		expect(snapshot.vendorChoice).toBeNull();
		// The save outbox listens for this to drop the cleared subject's saves.
		expect(cleared).toHaveBeenCalledOnce();
		runtime.dispose();
	});

	test('`clearRecords()` with persistence clears storage and announces it', async () => {
		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			prefetch: RESOLVED_PREFETCH,
		});
		runtime.start();
		await runtime.kernel.commands.save('all');
		const cleared = vi.fn();
		runtime.kernel.events.on('records:cleared', cleared);

		runtime.clearRecords();

		expect(cleared).toHaveBeenCalledOnce();
		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
		expect(document.cookie).not.toContain('c15t=');
		runtime.dispose();
	});

	test('a prefetch still marked pending is not adopted: `start()` runs init', async () => {
		// React treated any prefetch with a policy as resolved; the policy of
		// a provisional prefetch is a placeholder, so the runtime asks.
		const transport = createTransport();
		const runtime = createConsentRuntime({
			mode: custom(transport),
			prefetch: { ...RESOLVED_PREFETCH, initialPolicyPending: true },
		});

		runtime.start();
		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
		runtime.dispose();
	});

	test('adopting a resolved prefetch marks the kernel live, honours a detected GPC signal and replays `init:applied`', () => {
		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			prefetch: {
				...RESOLVED_PREFETCH,
				initialPrivacySignals: { gpc: true },
				now: 1000,
			},
		});
		const applied = vi.fn();
		runtime.kernel.events.on('init:applied', applied);

		runtime.start();

		const snapshot = runtime.kernel.getSnapshot();
		expect(snapshot.surfaceShownAt.banner).not.toBeNull();
		expect(snapshot.privacySignals.gpc.detected).toBe(true);
		expect(applied).toHaveBeenCalledOnce();
		runtime.dispose();
	});

	test('`dispose()` tears modules down in reverse start order, before the kernel', () => {
		// Vue disposed in push order, so the script loader went before the
		// blockers that still read from the kernel.
		const order: string[] = [];
		const tracked = <Handle extends { dispose: () => void }>(
			name: string,
			handle: Handle
		): Handle => ({
			...handle,
			dispose: () => {
				order.push(name);
				handle.dispose();
			},
		});
		const runtime = createConsentProviderRuntime(
			{
				mode: custom(createTransport()),
				networkBlocker: { rules: [] },
				prefetch: RESOLVED_PREFETCH,
				scripts: [{ callbackOnly: true, category: 'measurement', id: 'a' }],
			},
			{
				...defaultRuntimeModules,
				createIframeBlocker: (options) =>
					tracked('iframe', createIframeBlocker(options)),
				createNetworkBlocker: (options) =>
					tracked('network', createNetworkBlocker(options)),
				createPersistence: (options) =>
					tracked('persistence', createPersistence(options)),
				createScriptLoader: (options) =>
					tracked('scripts', createScriptLoader(options)),
			}
		);
		runtime.start();
		const { kernel } = runtime;
		runtime.kernel.subscribe(() => {
			order.push('kernel still notifies');
		});

		runtime.dispose();

		expect(order.filter((entry) => entry !== 'kernel still notifies')).toEqual([
			'iframe',
			'network',
			'scripts',
			'persistence',
		]);
		expect(kernel.getSnapshot()).toBeDefined();
	});

	test('the IAB factory receives the configured publisher options over what the backend sent', () => {
		// Vue mounted IAB from `cmpId` alone, which reset the publisher's
		// restrictions and custom vendors.
		const createIAB = vi.fn().mockReturnValue(createIABHandle());
		const publisherRestrictions = [
			{ purposeId: 2, restrictionType: 0, vendorIds: [1] },
		];
		const customVendors = [{ id: 'own', name: 'Own', purposes: [1] }];
		const runtime = createConsentRuntime({
			createIAB,
			iab: {
				customVendors: customVendors as never,
				publisherCountryCode: 'DE',
				publisherRestrictions: publisherRestrictions as never,
			},
			mode: custom(createTransport()),
		});

		runtime.start();
		runtime.kernel.set.iab({ cmpId: 9, enabled: true });

		expect(createIAB.mock.calls[0]?.[0]).toMatchObject({
			cmpId: 9,
			customVendors,
			publisherCountryCode: 'DE',
			publisherRestrictions,
		});
		runtime.dispose();
	});

	test('`setLanguage()` switches the language and asks the backend again, once', async () => {
		const transport = createTransport();
		const runtime = createConsentRuntime({
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		});
		runtime.start();

		runtime.setLanguage('de');
		runtime.setLanguage('de');

		expect(runtime.kernel.getSnapshot().overrides.language).toBe('de');
		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
		runtime.dispose();
	});

	test('`setLanguage()` does not ask a backend while disabled or under an external source', async () => {
		const disabledTransport = createTransport();
		const disabled = createConsentRuntime({
			enabled: false,
			mode: custom(disabledTransport),
		});
		disabled.setLanguage('de');

		const externalTransport = createTransport();
		const external = createConsentRuntime({
			consentSource: {
				getPermissions: () => null,
				openPreferences: vi.fn(),
				subscribe: () => () => undefined,
			},
			mode: custom(externalTransport),
		});
		external.setLanguage('de');

		await Promise.resolve();
		expect(disabledTransport.init).not.toHaveBeenCalled();
		expect(externalTransport.init).not.toHaveBeenCalled();
		disabled.dispose();
		external.dispose();
	});

	test('`experiment` is the one a ready prefetch carries, otherwise the option', () => {
		const option = { arms: { a: {} }, id: 'option' };
		const server = { arm: 'b', arms: { b: {} }, id: 'server' };
		const fromOption = createConsentRuntime({
			experiment: option,
			mode: custom(createTransport()),
		});
		const fromServer = createConsentRuntime({
			experiment: option,
			mode: custom(createTransport()),
			prefetch: { ...RESOLVED_PREFETCH, experiment: server },
		});

		expect(fromOption.experiment).toBe(option);
		expect(fromServer.experiment).toBe(server);
		fromOption.dispose();
		fromServer.dispose();
	});
});
