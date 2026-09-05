/**
 * @vitest-environment jsdom
 *
 * `createConsentRuntime` — construction, `start()`, `dispose()`.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { saveConsentToStorage } from '../../libs/cookie';
import { custom } from '../../transports/mode';
import type { KernelTransport } from '../../types';
import { createConsentRuntime, createRuntimeKernel } from '../index';
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

describe('createRuntimeKernel', () => {
	test('throws when `mode` is not a transport factory', () => {
		expect(() =>
			createRuntimeKernel({ mode: undefined as never })
		).toThrowError(/`mode` is required/u);
	});

	test('grants every category and suppresses UI when disabled', () => {
		const kernel = createRuntimeKernel({
			enabled: false,
			mode: custom(createTransport()),
		});

		expect(kernel.getSnapshot().consents.marketing).toBe(true);
		expect(kernel.getSnapshot().policy?.id).toBe('no_banner');
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

describe('createConsentRuntime', () => {
	test('hydrates stored consent before `start()` so the banner never shows', () => {
		saveConsentToStorage({
			consentInfo: { time: Date.now(), type: 'all' },
			consents: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
		} as never);

		const runtime = createConsentRuntime({ mode: custom(createTransport()) });

		expect(runtime.kernel.getSnapshot().hasConsented).toBe(true);
		expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
		runtime.dispose();
	});

	test('skips early hydration when persistence is disabled', () => {
		saveConsentToStorage({
			consentInfo: { time: Date.now(), type: 'all' },
			consents: { necessary: true },
		} as never);

		const runtime = createConsentRuntime({
			mode: custom(createTransport()),
			persistence: false,
		});

		expect(runtime.kernel.getSnapshot().hasConsented).toBe(false);
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
		runtime.onIABChange((next) => seen.push(next));

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
