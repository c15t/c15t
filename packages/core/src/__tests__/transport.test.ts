/**
 * Transport + commands.init / commands.save tests.
 *
 * These verify the pluggable transport wiring without hitting a real
 * backend. createHostedTransport is also unit-tested against a mocked
 * fetch so we know the request shape and error handling are correct.
 */
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentKernel, createHostedTransport } from '../index';
import type { InitResponse, KernelTransport, SaveResult } from '../index';
import { PENDING_SAVES_STORAGE_KEY } from '../libs/storage-keys';
import { createManifestTransport } from '../transports/manifest';

const fallbackStorageValues = new Map<string, string>();
const fallbackLocalStorage: Storage = {
	clear() {
		fallbackStorageValues.clear();
	},
	getItem(key) {
		return fallbackStorageValues.get(key) ?? null;
	},
	key(index) {
		return [...fallbackStorageValues.keys()][index] ?? null;
	},
	get length() {
		return fallbackStorageValues.size;
	},
	removeItem(key) {
		fallbackStorageValues.delete(key);
	},
	setItem(key, value) {
		fallbackStorageValues.set(key, value);
	},
};
const fallbackWindowEvents = new EventTarget();
const fallbackWindow = {
	addEventListener:
		fallbackWindowEvents.addEventListener.bind(fallbackWindowEvents),
	localStorage: fallbackLocalStorage,
	removeEventListener:
		fallbackWindowEvents.removeEventListener.bind(fallbackWindowEvents),
};

beforeEach(() => {
	if (typeof window === 'undefined') {
		vi.stubGlobal('window', fallbackWindow);
	}
	if (typeof window !== 'undefined') {
		window.localStorage.removeItem(PENDING_SAVES_STORAGE_KEY);
	}
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	if (typeof window !== 'undefined') {
		window.localStorage.removeItem(PENDING_SAVES_STORAGE_KEY);
	}
});

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const REALISTIC_INIT_OUTPUT = {
	branding: 'c15t',
	cmpId: 28,
	customVendors: [
		{
			id: 'internal-analytics',
			legIntPurposes: [2],
			name: 'Internal Analytics',
			privacyPolicyUrl: 'https://example.com/privacy',
			purposes: [1, 7],
			usesCookies: true,
		},
	],
	gvl: {
		features: {},
		gvlSpecificationVersion: 3,
		lastUpdated: '2026-01-01T00:00:00Z',
		purposes: {},
		specialFeatures: {},
		specialPurposes: {},
		stacks: {},
		tcfPolicyVersion: 4,
		vendorListVersion: 42,
		vendors: {},
	},
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: 'BE' },
	policy: {
		consent: {
			categories: ['necessary', 'functionality', 'marketing', 'measurement'],
			expiryDays: 180,
			gpc: true,
			preselectedCategories: ['necessary'],
			scopeMode: 'strict',
		},
		i18n: {
			language: 'de',
			messageProfile: 'formal',
		},
		id: 'de-iab',
		model: 'iab',
		proof: {
			storeIp: false,
			storeLanguage: true,
			storeUserAgent: true,
		},
		ui: {
			banner: {
				allowedActions: ['accept', 'reject', 'customize'],
				direction: 'row',
				primaryActions: ['accept'],
				scrollLock: false,
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				direction: 'column',
				primaryActions: ['accept', 'customize'],
				scrollLock: true,
				uiProfile: 'strict',
			},
			mode: 'dialog',
		},
	},
	policyDecision: {
		country: 'DE',
		fingerprint: 'policy-fingerprint',
		jurisdiction: 'GDPR',
		matchedBy: 'region',
		policyId: 'de-iab',
		region: 'BE',
	},
	policySnapshotToken: 'snapshot-token',
	translations: {
		language: 'de',
		translations: {
			common: {
				acceptAll: 'Alle akzeptieren',
				customize: 'Anpassen',
				rejectAll: 'Alle ablehnen',
				save: 'Speichern',
			},
			consentManagerDialog: {
				description: 'Verwalten Sie Ihre Praeferenzen.',
				title: 'Datenschutzeinstellungen',
			},
			consentTypes: {
				experience: {
					description: 'Personalisierte Funktionen.',
					title: 'Erlebnis',
				},
				functionality: {
					description: 'Verbesserte Websitefunktionen.',
					title: 'Funktionalitaet',
				},
				marketing: {
					description: 'Personalisierte Werbung.',
					title: 'Marketing',
				},
				measurement: {
					description: 'Nutzungsmessung.',
					title: 'Analyse',
				},
				necessary: {
					description: 'Erforderliche Cookies.',
					title: 'Notwendig',
				},
			},
			cookieBanner: {
				description: 'Waehlen Sie aus, welche Cookies verwendet werden.',
				title: 'Cookies verwalten',
			},
			frame: {
				actionButton: 'Einstellungen oeffnen',
				title: 'Cookie-Einstellungen',
			},
			legalLinks: {
				cookiePolicy: 'Cookie-Richtlinie',
				privacyPolicy: 'Datenschutz',
				termsOfService: 'Nutzungsbedingungen',
			},
		},
	},
} satisfies InitOutput;

const MANIFEST_FIXTURE = {
	branding: 'c15t',
	cmpId: 28,
	iab: {
		customVendors: [{ id: 'internal-analytics' }],
		enabled: true,
		gvl: { url: 'https://gvl.example.com', version: 42 },
	},
	policyPacks: [
		{
			fingerprint: 'policy-fingerprint',

			policy: {
				consent: {
					expiryDays: 180,
					gpc: true,

					model: 'iab',
					scopeMode: 'strict',
				},

				i18n: { language: 'de', messageProfile: 'formal' },
				id: 'de-iab',
				match: { regions: [{ country: 'DE', region: 'BE' }] },
			},
			resolvedPolicy: {
				consent: {
					categories: ['*'],
					expiryDays: 180,
					gpc: true,

					scopeMode: 'strict',
				},
				i18n: { language: 'de', messageProfile: 'formal' },
				id: 'de-iab',
				model: 'iab',
				proof: {},
			},
		},
	],
	revision: 'manifest-revision',
	schemaVersion: 1,
	translations: {
		i18n: {
			defaultProfile: 'formal',
			messages: {
				formal: {
					fallbackLanguage: 'en',
					translations: {
						de: {
							common: {
								acceptAll: 'Alle akzeptieren',
							},
						},
					},
				},
			},
		},
	},
} satisfies ConsentManifest;

describe('kernel transport: no transport = no-op commands', () => {
	test('init returns ok without firing any network call', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response());
		vi.stubGlobal('fetch', fetchSpy);

		try {
			const kernel = createConsentKernel();
			const result = await kernel.commands.init();

			expect(result.ok).toBe(true);
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	test('save returns ok without firing any network call', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response());
		vi.stubGlobal('fetch', fetchSpy);

		try {
			const kernel = createConsentKernel();
			const result = await kernel.commands.save('all');

			expect(result.ok).toBe(true);
			expect(fetchSpy).not.toHaveBeenCalled();
			expect(kernel.getSnapshot().hasConsented).toBe(true);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('kernel transport: init applies response to snapshot', () => {
	test('legacy jurisdiction + showConsentBanner init fields are ignored', async () => {
		const transport: KernelTransport = {
			init() {
				return {
					jurisdiction: 'GDPR',
					showConsentBanner: true,
				} as InitResponse;
			},
		};
		const kernel = createConsentKernel({ transport });

		expect(kernel.getSnapshot().model).toBeNull();
		expect(kernel.getSnapshot().activeUI).toBe('none');

		await kernel.commands.init();

		expect(kernel.getSnapshot().model).toBeNull();
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('resolvedOverrides merge into snapshot.overrides', async () => {
		const transport: KernelTransport = {
			init() {
				return {
					resolvedOverrides: { country: 'DE', region: 'BE' },
				};
			},
		};
		const kernel = createConsentKernel({
			initialOverrides: { language: 'de' },
			transport,
		});

		await kernel.commands.init();

		expect(kernel.getSnapshot().overrides).toEqual({
			country: 'DE',
			language: 'de',
			region: 'BE',
		});
	});

	test('server-side consents override config when returned', async () => {
		const transport: KernelTransport = {
			init() {
				return {
					consents: { marketing: true, measurement: true },
					hasConsented: true,
				};
			},
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();

		const snap = kernel.getSnapshot();
		expect(snap.consents.marketing).toBe(true);
		expect(snap.consents.measurement).toBe(true);
		expect(snap.hasConsented).toBe(true);
	});

	test('init passes current overrides + user as InitContext', async () => {
		const initSpy = vi.fn<NonNullable<KernelTransport['init']>>();
		initSpy.mockResolvedValue({});
		const transport: KernelTransport = { init: initSpy };

		const kernel = createConsentKernel({
			initialOverrides: { country: 'US', language: 'en' },
			initialUser: { externalId: 'user-42' },
			transport,
		});

		await kernel.commands.init();

		expect(initSpy).toHaveBeenCalledTimes(1);
		const ctx = initSpy.mock.calls[0]?.[0];
		expect(ctx?.overrides).toEqual({ country: 'US', language: 'en' });
		expect(ctx?.user?.externalId).toBe('user-42');
	});

	test('init emits command:init:started then :completed', async () => {
		const events: string[] = [];
		const transport: KernelTransport = {
			init() {
				return {};
			},
		};
		const kernel = createConsentKernel({ transport });
		kernel.events.on('command:init:started', () => events.push('started'));
		kernel.events.on('command:init:completed', (e) =>
			events.push(`completed:${String(e.result.ok)}`)
		);

		await kernel.commands.init();

		expect(events).toEqual(['started', 'completed:true']);
	});

	test('init transport error → result.ok=false + command:error event', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const boom = new Error('backend on fire');
		const transport: KernelTransport = {
			init() {
				throw boom;
			},
		};
		const kernel = createConsentKernel({ initRetry: false, transport });

		const errors: unknown[] = [];
		kernel.events.on('command:error', (e) => errors.push(e.error));

		const result = await kernel.commands.init();

		expect(result.ok).toBe(false);
		expect(result.error).toBe(boom);
		expect(errors).toEqual([boom]);
		// Snapshot should be unchanged.
		expect(kernel.getSnapshot().model).toBeNull();
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('provisional policy suppresses activeUI until init resolves', async () => {
		let resolveInit: (value: Record<string, never>) => void = () => {};
		const transport: KernelTransport = {
			init() {
				return createDeferredPromise((resolve) => {
					resolveInit = resolve;
				});
			},
		};
		const kernel = createConsentKernel({
			initialPolicy: {
				id: 'placeholder',
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
			initialPolicyProvisional: true,
			transport,
		});

		// Model is populated for SSR ergonomics, but no surface renders.
		expect(kernel.getSnapshot().model).toBe('opt-in');
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(kernel.getSnapshot().policyProvisional).toBe(true);

		const pending = kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('none');

		resolveInit({});
		await pending;

		expect(kernel.getSnapshot().policyProvisional).toBe(false);
		expect(kernel.getSnapshot().activeUI).toBe('banner');
	});

	test('provisional policy stays withheld when init fails', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const boom = new Error('backend unreachable');
		const transport: KernelTransport = {
			init() {
				throw boom;
			},
		};
		const kernel = createConsentKernel({
			initRetry: false,
			initialPolicy: {
				id: 'placeholder',
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
			initialPolicyProvisional: true,
			transport,
		});
		const initFailures: {
			attempt: number;
			error: unknown;
			nextRetryMs: number | null;
		}[] = [];
		const commandErrors: unknown[] = [];
		kernel.events.on('init:failed', (event) => {
			initFailures.push(event);
		});
		kernel.events.on('command:error', (event) => {
			commandErrors.push(event.error);
		});

		const result = await kernel.commands.init();

		expect(result.ok).toBe(false);
		expect(kernel.getSnapshot().policyProvisional).toBe(true);
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(initFailures).toEqual([
			{ attempt: 1, error: boom, nextRetryMs: null, type: 'init:failed' },
		]);
		expect(commandErrors).toEqual([boom]);
	});

	test('retries failed init with jittered backoff until it succeeds', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		const initSpy = vi
			.fn<NonNullable<KernelTransport['init']>>()
			.mockRejectedValueOnce(new Error('first failure'))
			.mockRejectedValueOnce(new Error('second failure'))
			.mockResolvedValue({});
		const kernel = createConsentKernel({
			initRetry: { baseDelayMs: 100, maxAttempts: 3, maxDelayMs: 1000 },
			initialPolicy: {
				id: 'placeholder',
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
			initialPolicyProvisional: true,
			transport: { init: initSpy },
		});
		const failures: { attempt: number; nextRetryMs: number | null }[] = [];
		const commandEvents: string[] = [];
		kernel.events.on('init:failed', (event) => {
			failures.push({
				attempt: event.attempt,
				nextRetryMs: event.nextRetryMs,
			});
		});
		kernel.events.on('command:init:started', () => {
			commandEvents.push('started');
		});
		kernel.events.on('command:init:completed', (event) => {
			commandEvents.push(`completed:${String(event.result.ok)}`);
		});

		const firstResult = await kernel.commands.init();
		expect(firstResult.ok).toBe(false);
		expect(failures).toEqual([{ attempt: 1, nextRetryMs: 75 }]);

		await vi.advanceTimersByTimeAsync(75);
		expect(failures).toEqual([
			{ attempt: 1, nextRetryMs: 75 },
			{ attempt: 2, nextRetryMs: 150 },
		]);

		await vi.advanceTimersByTimeAsync(150);
		expect(initSpy).toHaveBeenCalledTimes(3);
		expect(kernel.getSnapshot().policyProvisional).toBe(false);
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(commandEvents).toEqual([
			'started',
			'completed:false',
			'started',
			'completed:false',
			'started',
			'completed:true',
		]);
		kernel.dispose();
	});

	test('initRetry false never retries', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const initSpy = vi.fn().mockRejectedValue(new Error('offline'));
		const kernel = createConsentKernel({
			initRetry: false,
			transport: { init: initSpy },
		});

		await kernel.commands.init();
		await vi.advanceTimersByTimeAsync(60_000);

		expect(initSpy).toHaveBeenCalledTimes(1);
		kernel.dispose();
	});

	test('dispose cancels a pending init retry', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(Math, 'random').mockReturnValue(1);
		const initSpy = vi.fn().mockRejectedValue(new Error('offline'));
		const kernel = createConsentKernel({
			initRetry: { baseDelayMs: 100, maxAttempts: 3 },
			transport: { init: initSpy },
		});

		await kernel.commands.init();
		kernel.dispose();
		kernel.dispose();
		await vi.advanceTimersByTimeAsync(1000);

		expect(initSpy).toHaveBeenCalledTimes(1);
	});

	test('init after dispose re-arms background retries', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(Math, 'random').mockReturnValue(1);
		const initSpy = vi.fn().mockRejectedValue(new Error('offline'));
		const kernel = createConsentKernel({
			initRetry: { baseDelayMs: 100, maxAttempts: 3 },
			transport: { init: initSpy },
		});

		await kernel.commands.init();
		kernel.dispose();
		// StrictMode-style remount: same kernel, init called again.
		await kernel.commands.init();
		await vi.advanceTimersByTimeAsync(1000);

		// 1 (first mount) + 1 (remount) + 2 retries after the remount.
		expect(initSpy).toHaveBeenCalledTimes(4);
	});

	test('a newer init supersedes a slower in-flight attempt', async () => {
		let resolveFirst: (value: InitResponse) => void = () => {};
		const initSpy = vi
			.fn<NonNullable<KernelTransport['init']>>()
			.mockImplementationOnce(() =>
				createDeferredPromise<InitResponse>((resolve) => {
					resolveFirst = resolve;
				})
			)
			.mockResolvedValueOnce({ resolvedOverrides: { language: 'fr' } });
		const kernel = createConsentKernel({ transport: { init: initSpy } });
		const completed: boolean[] = [];
		kernel.events.on('command:init:completed', ({ result }) => {
			completed.push(result.ok);
		});

		const first = kernel.commands.init();
		const second = await kernel.commands.init();
		expect(second.ok).toBe(true);
		expect(kernel.getSnapshot().overrides.language).toBe('fr');

		resolveFirst({ resolvedOverrides: { language: 'de' } });
		const firstResult = await first;

		expect(firstResult.ok).toBe(false);
		expect(kernel.getSnapshot().overrides.language).toBe('fr');
		expect(completed).toEqual([true, false]);
		kernel.dispose();
	});

	test('a superseded failure neither warns nor schedules a retry', async () => {
		vi.useFakeTimers();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let rejectFirst: (reason: unknown) => void = () => {};
		const initSpy = vi
			.fn<NonNullable<KernelTransport['init']>>()
			.mockImplementationOnce(() =>
				createDeferredPromise<InitResponse>((_resolve, reject) => {
					rejectFirst = reject;
				})
			)
			.mockResolvedValue({});
		const kernel = createConsentKernel({
			initRetry: { baseDelayMs: 100, maxAttempts: 3 },
			transport: { init: initSpy },
		});
		const failures: number[] = [];
		kernel.events.on('init:failed', ({ attempt }) => {
			failures.push(attempt);
		});

		const first = kernel.commands.init();
		await kernel.commands.init();
		rejectFirst(new Error('slow failure'));
		await first;
		await vi.advanceTimersByTimeAsync(1000);

		expect(failures).toEqual([]);
		expect(warn).not.toHaveBeenCalled();
		expect(initSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('online retries init immediately', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(Math, 'random').mockReturnValue(1);
		const originalWindow = globalThis.window;
		const browserEvents = new EventTarget();
		vi.stubGlobal('window', {
			...originalWindow,
			addEventListener: browserEvents.addEventListener.bind(browserEvents),
			removeEventListener:
				browserEvents.removeEventListener.bind(browserEvents),
		});
		const initSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue({});
		const kernel = createConsentKernel({
			initRetry: { baseDelayMs: 10_000, maxAttempts: 2 },
			transport: { init: initSpy },
		});

		try {
			await kernel.commands.init();
			browserEvents.dispatchEvent(new Event('online'));
			await vi.advanceTimersByTimeAsync(0);

			expect(initSpy).toHaveBeenCalledTimes(2);
			await vi.advanceTimersByTimeAsync(10_000);
			expect(initSpy).toHaveBeenCalledTimes(2);
		} finally {
			kernel.dispose();
			vi.stubGlobal('window', originalWindow);
		}
	});

	test('defers a due retry until the document becomes visible', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(Math, 'random').mockReturnValue(1);
		const originalDocument = globalThis.document;
		let visibilityState: DocumentVisibilityState = 'hidden';
		const listeners = new Set<EventListener>();
		vi.stubGlobal('document', {
			...originalDocument,
			addEventListener(type: string, listener: EventListener) {
				if (type === 'visibilitychange') {
					listeners.add(listener);
				}
			},
			removeEventListener(type: string, listener: EventListener) {
				if (type === 'visibilitychange') {
					listeners.delete(listener);
				}
			},
			get visibilityState() {
				return visibilityState;
			},
		});
		const initSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue({});
		const kernel = createConsentKernel({
			initRetry: { baseDelayMs: 100, maxAttempts: 2 },
			transport: { init: initSpy },
		});

		try {
			await kernel.commands.init();
			await vi.advanceTimersByTimeAsync(100);
			expect(initSpy).toHaveBeenCalledTimes(1);

			visibilityState = 'visible';
			for (const listener of listeners) {
				listener(new Event('visibilitychange'));
			}
			await vi.runAllTimersAsync();
			expect(initSpy).toHaveBeenCalledTimes(2);
		} finally {
			kernel.dispose();
			vi.stubGlobal('document', originalDocument);
		}
	});

	test('getServerSnapshot stays at revision 0 through client mutations', async () => {
		const kernel = createConsentKernel({
			initialPolicy: {
				id: 'placeholder',
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
			transport: {
				init() {
					return {};
				},
			},
		});
		const server = kernel.getServerSnapshot();
		expect(server.revision).toBe(0);
		expect(server.activeUI).toBe('banner');

		// Simulate the client boot mutations that land before hydration
		// completes: persistence hydrate flips the UI off…
		kernel.set.hasConsented(true);
		kernel.set.activeUI('none');
		await kernel.commands.init();

		// …but hydration must still be able to render what the server saw.
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(kernel.getServerSnapshot()).toBe(server);
		expect(kernel.getServerSnapshot().activeUI).toBe('banner');
	});

	test('provisional policy finalizes when the transport has no init', async () => {
		const kernel = createConsentKernel({
			initialPolicy: {
				id: 'placeholder',
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
			initialPolicyProvisional: true,
			transport: {},
		});

		expect(kernel.getSnapshot().activeUI).toBe('none');
		await kernel.commands.init();
		expect(kernel.getSnapshot().policyProvisional).toBe(false);
		expect(kernel.getSnapshot().activeUI).toBe('banner');
	});
});

describe('kernel transport: save flows consents to backend', () => {
	test('save calls transport.save with current consent payload', async () => {
		const saveSpy = vi.fn<NonNullable<KernelTransport['save']>>();
		saveSpy.mockResolvedValue({ ok: true, subjectId: 'sub-1' });
		const transport: KernelTransport = { save: saveSpy };

		const kernel = createConsentKernel({ transport });
		const result = await kernel.commands.save('all');

		expect(result.ok).toBe(true);
		expect(result.subjectId).toBe('sub-1');
		expect(saveSpy).toHaveBeenCalledTimes(1);
		const payload = saveSpy.mock.calls[0]?.[0];
		expect(payload?.subjectId).toMatch(/^sub_/u);
		expect(payload?.consents.marketing).toBe(true);
	});

	test('save creates and reuses a subjectId', async () => {
		const saveSpy = vi.fn<NonNullable<KernelTransport['save']>>();
		saveSpy.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ transport: { save: saveSpy } });

		await kernel.commands.save('all');
		const first = kernel.getSnapshot().subjectId;
		await kernel.commands.save({ marketing: false });
		const second = kernel.getSnapshot().subjectId;

		expect(first).toMatch(/^sub_/u);
		expect(second).toBe(first);
		expect(saveSpy.mock.calls[0]?.[0].subjectId).toBe(first);
		expect(saveSpy.mock.calls[1]?.[0].subjectId).toBe(first);
	});

	test('save commits the snapshot synchronously but defers transport.save off the commit task', async () => {
		const saveSpy = vi.fn<NonNullable<KernelTransport['save']>>();
		saveSpy.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ transport: { save: saveSpy } });

		const pending = kernel.commands.save('all');

		// The optimistic commit is synchronous — UI can flip and paint…
		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(kernel.getSnapshot().activeUI).toBe('none');
		// …while the network call is deferred a macrotask so it never
		// contends with the commit/paint task.
		expect(saveSpy).not.toHaveBeenCalled();

		const result = await pending;
		expect(result.ok).toBe(true);
		expect(saveSpy).toHaveBeenCalledTimes(1);
	});

	test('save transport error → result.ok=false + command:error event', async () => {
		const boom = new Error('save failed');
		const transport: KernelTransport = {
			save() {
				throw boom;
			},
		};
		const kernel = createConsentKernel({ transport });

		const errors: unknown[] = [];
		kernel.events.on('command:error', (e) => errors.push(e.error));

		const result = await kernel.commands.save('all');
		expect(result.ok).toBe(false);
		expect(errors).toEqual([boom]);
		// Snapshot mutation still happened (local optimistic commit).
		expect(kernel.getSnapshot().hasConsented).toBe(true);
	});
});

describe('kernel transport: failed save replay', () => {
	test('successful init starts replay without waiting for it', async () => {
		const lifecycle: string[] = [];
		let resolveReplay: (
			value: SaveResult | PromiseLike<SaveResult>
		) => void = () => {};
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockImplementationOnce(() =>
				createDeferredPromise<SaveResult>((resolve) => {
					lifecycle.push('replay started');
					resolveReplay = resolve;
				})
			);
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', (event) => {
			replayed.push({ ok: event.ok, subjectId: event.subjectId });
		});
		kernel.events.on('command:init:completed', () => {
			lifecycle.push('init completed');
		});

		const saveResult = await kernel.commands.save('all');
		expect(saveResult.ok).toBe(false);
		const stored = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		expect(stored).toHaveLength(1);
		expect(stored[0].payload.subjectId).toBe(kernel.getSnapshot().subjectId);

		const initResult = await kernel.commands.init();
		expect(initResult.ok).toBe(true);
		// The replay takes the cross-tab queue lock first, so it starts a
		// task or two after init resolved.
		await vi.waitFor(() => {
			expect(saveSpy).toHaveBeenCalledTimes(2);
		});
		expect(replayed).toEqual([]);
		expect(lifecycle).toEqual(['init completed', 'replay started']);

		resolveReplay({ ok: true });
		await vi.waitFor(() => {
			expect(replayed).toEqual([
				{ ok: true, subjectId: kernel.getSnapshot().subjectId },
			]);
		});
		expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		kernel.dispose();
	});

	test('init replays queued saves when the transport has no init', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ transport: { save: saveSpy } });

		await kernel.commands.save('all');
		expect(
			JSON.parse(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]')
		).toHaveLength(1);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		});
		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('a successful save discards the queued save for its subject', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			initialSubjectId: 'sub_fixed',
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: boolean[] = [];
		kernel.events.on('save:replayed', ({ ok }) => {
			replayed.push(ok);
		});

		await kernel.commands.save('all');
		expect(
			JSON.parse(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]')
		).toHaveLength(1);

		await kernel.commands.save('none');
		expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();

		// The stale 'all' must never reach the backend after 'none' did.
		await kernel.commands.init();
		await createDeferredPromise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(replayed).toEqual([]);
		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('queued saves replay with the original givenAt', async () => {
		vi.useFakeTimers({ now: 1_700_000_000_000 });
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		const pendingSave = kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(0);
		await pendingSave;
		const stored = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		expect(stored[0].payload.givenAt).toBe(1_700_000_000_000);

		vi.setSystemTime(1_700_000_060_000);
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(saveSpy).toHaveBeenCalledTimes(2);
		});
		expect(saveSpy.mock.calls[1]?.[0]).toMatchObject({
			givenAt: 1_700_000_000_000,
		});
		kernel.dispose();
	});

	test('queue updates wait for the cross-tab Web Lock', async () => {
		const originalNavigator = globalThis.navigator;
		let chain: Promise<unknown> = Promise.resolve();
		const lockNames: string[] = [];
		const locks = {
			request(name: string, run: () => unknown) {
				lockNames.push(name);
				const granted = chain.then(run);
				chain = granted.catch(() => undefined);
				return granted;
			},
		};
		vi.stubGlobal('navigator', { locks });
		const kernel = createConsentKernel({
			initialSubjectId: 'sub_fixed',
			transport: {
				save: vi.fn().mockRejectedValue(new Error('save offline')),
			},
		});

		try {
			// Another tab holds the queue lock.
			let releaseLock: () => void = () => {};
			void locks.request(PENDING_SAVES_STORAGE_KEY, () =>
				createDeferredPromise<boolean>((resolve) => {
					releaseLock = () => resolve(true);
				})
			);

			const saveCompleted: boolean[] = [];
			kernel.events.on('command:save:completed', ({ result }) => {
				saveCompleted.push(result.ok);
			});
			const pendingSave = kernel.commands.save('all');
			await createDeferredPromise((resolve) => {
				setTimeout(resolve, 0);
			});

			expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
			expect(saveCompleted).toEqual([]);

			releaseLock();
			await expect(pendingSave).resolves.toEqual({ ok: false });
			expect(saveCompleted).toEqual([false]);
			expect(
				JSON.parse(
					window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
				)
			).toHaveLength(1);
			expect(new Set(lockNames)).toEqual(new Set([PENDING_SAVES_STORAGE_KEY]));
		} finally {
			kernel.dispose();
			vi.stubGlobal('navigator', originalNavigator);
		}
	});

	test('queue updates fall back to unsynchronized access when the lock request rejects', async () => {
		const originalNavigator = globalThis.navigator;
		const request = vi.fn().mockRejectedValue(new Error('lock aborted'));
		vi.stubGlobal('navigator', { locks: { request } });
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		try {
			await kernel.commands.save('all');
			expect(request).toHaveBeenCalled();
			expect(
				JSON.parse(
					window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
				)
			).toHaveLength(1);

			await kernel.commands.init();
			await vi.waitFor(() => {
				expect(
					window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)
				).toBeNull();
			});
			expect(saveSpy).toHaveBeenCalledTimes(2);
		} finally {
			kernel.dispose();
			vi.stubGlobal('navigator', originalNavigator);
		}
	});

	test('queue updates fall back when navigator.locks is inaccessible', async () => {
		const originalNavigator = globalThis.navigator;
		vi.stubGlobal('navigator', {
			get locks(): LockManager {
				throw new Error('locks blocked');
			},
		});
		const kernel = createConsentKernel({
			transport: {
				save: vi.fn().mockRejectedValue(new Error('save offline')),
			},
		});

		try {
			await expect(kernel.commands.save('all')).resolves.toEqual({ ok: false });
			expect(
				JSON.parse(
					window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
				)
			).toHaveLength(1);
		} finally {
			kernel.dispose();
			vi.stubGlobal('navigator', originalNavigator);
		}
	});

	test('replay skips an entry another tab already replayed', async () => {
		const originalNavigator = globalThis.navigator;
		// Lock requests, in order: enqueue, replay listing, per-entry check.
		// Another tab drains the queue right before the per-entry check.
		let requests = 0;
		const locks = {
			request(_name: string, run: () => unknown) {
				requests += 1;
				if (requests === 3) {
					window.localStorage.removeItem(PENDING_SAVES_STORAGE_KEY);
				}
				return Promise.resolve().then(run);
			},
		};
		vi.stubGlobal('navigator', { locks });
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: boolean[] = [];
		kernel.events.on('save:replayed', ({ ok }) => {
			replayed.push(ok);
		});

		try {
			await kernel.commands.save('all');
			await kernel.commands.init();
			await vi.waitFor(() => {
				expect(requests).toBeGreaterThanOrEqual(4);
			});

			expect(saveSpy).toHaveBeenCalledTimes(1);
			expect(replayed).toEqual([]);
			expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		} finally {
			kernel.dispose();
			vi.stubGlobal('navigator', originalNavigator);
		}
	});

	test('drops malformed persisted queue entries before replay', async () => {
		const validPayload = {
			consentAction: 'custom',
			consents: { marketing: true, necessary: true },
			givenAt: 1_700_000_000_000,
			model: 'opt-out',
			overrides: {},
			policySnapshotToken: 'snap-1',
			subjectId: 'sub_valid',
			tcString: null,
			uiSource: 'dialog',
			user: {
				externalId: 'user-1',
				externalIdType: 'email',
				identityProvider: 'auth0',
				properties: { plan: 'pro', seats: 3, trial: false },
			},
		};
		const entry = (payload: unknown, extra: Record<string, unknown> = {}) => ({
			attempts: 0,
			payload,
			queuedAt: Date.now(),
			...extra,
		});
		window.localStorage.setItem(
			PENDING_SAVES_STORAGE_KEY,
			JSON.stringify([
				entry(validPayload),
				'not an entry',
				entry(null),
				entry({ ...validPayload, model: 'weird', subjectId: 'sub_model' }),
				entry({ ...validPayload, subjectId: 'sub_ui', uiSource: 'widget' }),
				entry({ ...validPayload, consentAction: 'x', subjectId: 'sub_action' }),
				entry({
					...validPayload,
					consents: { a: 1 },
					subjectId: 'sub_consents',
				}),
				entry({ ...validPayload, overrides: [], subjectId: 'sub_overrides' }),
				entry({ ...validPayload, subjectId: 'sub_user', user: { id: 1 } }),
				entry({
					...validPayload,
					subjectId: 'sub_user_type',
					user: { externalId: 'u', externalIdType: 7 },
				}),
				entry({
					...validPayload,
					subjectId: 'sub_user_props',
					user: { externalId: 'u', properties: { nested: {} } },
				}),
				entry({
					...validPayload,
					givenAt: 'yesterday',
					subjectId: 'sub_given',
				}),
				entry({
					...validPayload,
					policySnapshotToken: 1,
					subjectId: 'sub_token',
				}),
				entry({ ...validPayload, subjectId: 'sub_tc', tcString: 5 }),
				entry({ ...validPayload, subjectId: 42 }),
				entry({ ...validPayload, subjectId: 'sub_queued' }, { queuedAt: -1 }),
				entry(
					{ ...validPayload, subjectId: 'sub_attempts' },
					{ attempts: 1.5 }
				),
			])
		);
		const saveSpy = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		});

		expect(saveSpy).toHaveBeenCalledTimes(1);
		expect(saveSpy).toHaveBeenCalledWith(validPayload);
		kernel.dispose();
	});

	test.each([
		{ label: 'invalid JSON', stored: '{not json' },
		{ label: 'a non-array value', stored: '{"payload":{}}' },
	])('resets a queue holding $label', async ({ stored }) => {
		window.localStorage.setItem(PENDING_SAVES_STORAGE_KEY, stored);
		const saveSpy = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		});
		expect(saveSpy).not.toHaveBeenCalled();
		kernel.dispose();
	});

	test('replays every queued subject and records each result separately', async () => {
		const failingSave = vi.fn().mockRejectedValue(new Error('save offline'));
		const tabA = createConsentKernel({
			initialSubjectId: 'sub_a',
			transport: { save: failingSave },
		});
		const tabB = createConsentKernel({
			initialSubjectId: 'sub_b',
			transport: { save: failingSave },
		});
		await tabA.commands.save('all');
		await tabB.commands.save('none');
		tabA.dispose();
		tabB.dispose();

		// A fresh kernel replays the shared queue: sub_a succeeds, sub_b fails
		// and must survive the bookkeeping for sub_a's success.
		const replaySave = vi.fn(({ subjectId }: { subjectId: string }) =>
			subjectId === 'sub_b'
				? Promise.reject(new Error('still offline'))
				: Promise.resolve({ ok: true })
		);
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: replaySave },
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', ({ ok, subjectId }) => {
			replayed.push({ ok, subjectId });
		});

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(2);
		});

		expect(replayed).toEqual([
			{ ok: true, subjectId: 'sub_a' },
			{ ok: false, subjectId: 'sub_b' },
		]);
		const remaining = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		expect(remaining).toHaveLength(1);
		expect(remaining[0]).toMatchObject({
			attempts: 1,
			payload: { subjectId: 'sub_b' },
		});
		kernel.dispose();
	});

	test('overlapping replays share one run', async () => {
		const originalWindow = globalThis.window;
		const browserEvents = new EventTarget();
		vi.stubGlobal('window', {
			...originalWindow,
			addEventListener: browserEvents.addEventListener.bind(browserEvents),
			removeEventListener:
				browserEvents.removeEventListener.bind(browserEvents),
		});
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ transport: { save: saveSpy } });

		try {
			await kernel.commands.save('all');
			browserEvents.dispatchEvent(new Event('online'));
			browserEvents.dispatchEvent(new Event('online'));
			await vi.waitFor(() => {
				expect(
					window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)
				).toBeNull();
			});
			await createDeferredPromise((resolve) => {
				setTimeout(resolve, 0);
			});

			expect(saveSpy).toHaveBeenCalledTimes(2);
		} finally {
			kernel.dispose();
			vi.stubGlobal('window', originalWindow);
		}
	});

	test('discard and replay are no-ops without window', async () => {
		const originalWindow = globalThis.window;
		vi.stubGlobal('window', undefined);
		const saveSpy = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		try {
			await expect(kernel.commands.save('all')).resolves.toEqual({ ok: true });
			await expect(kernel.commands.init()).resolves.toEqual({ ok: true });
			await createDeferredPromise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(saveSpy).toHaveBeenCalledTimes(1);
		} finally {
			kernel.dispose();
			vi.stubGlobal('window', originalWindow);
		}
	});

	test('online event replays a failed save', async () => {
		const originalWindow = globalThis.window;
		const browserEvents = new EventTarget();
		vi.stubGlobal('window', {
			...originalWindow,
			addEventListener: browserEvents.addEventListener.bind(browserEvents),
			removeEventListener:
				browserEvents.removeEventListener.bind(browserEvents),
		});
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ transport: { save: saveSpy } });

		try {
			await kernel.commands.save('all');
			browserEvents.dispatchEvent(new Event('online'));
			await vi.waitFor(() => {
				expect(
					window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)
				).toBeNull();
			});

			expect(saveSpy).toHaveBeenCalledTimes(2);
		} finally {
			kernel.dispose();
			vi.stubGlobal('window', originalWindow);
		}
	});

	test('failed replay stays queued', async () => {
		const saveSpy = vi.fn().mockRejectedValue(new Error('save offline'));
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', (event) => {
			replayed.push({ ok: event.ok, subjectId: event.subjectId });
		});

		await kernel.commands.save('all');
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});

		expect(saveSpy).toHaveBeenCalledTimes(2);
		expect(replayed).toEqual([
			{ ok: false, subjectId: kernel.getSnapshot().subjectId },
		]);
		expect(
			JSON.parse(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]')
		).toHaveLength(1);
		kernel.dispose();
	});

	test('queued saves dedupe by subjectId and keep the newest payload', async () => {
		const kernel = createConsentKernel({
			initialSubjectId: 'sub_fixed',
			transport: {
				save: vi.fn().mockRejectedValue(new Error('save offline')),
			},
		});

		await kernel.commands.save('all');
		const firstEntry = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		firstEntry[0].attempts = 5;
		window.localStorage.setItem(
			PENDING_SAVES_STORAGE_KEY,
			JSON.stringify(firstEntry)
		);
		await kernel.commands.save('none');

		const stored = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		expect(stored).toHaveLength(1);
		expect(stored[0]).toMatchObject({
			attempts: 0,
			payload: {
				consentAction: 'necessary',
				consents: { marketing: false },
				subjectId: 'sub_fixed',
			},
		});
		kernel.dispose();
	});

	test('drops pending saves older than seven days before replay', async () => {
		const saveSpy = vi.fn().mockRejectedValue(new Error('save offline'));
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		await kernel.commands.save('all');
		const stored = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		stored[0].queuedAt = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1;
		window.localStorage.setItem(
			PENDING_SAVES_STORAGE_KEY,
			JSON.stringify(stored)
		);

		await kernel.commands.init();

		expect(saveSpy).toHaveBeenCalledTimes(1);
		expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		kernel.dispose();
	});

	test('increments failed replay attempts and drops the entry at ten', async () => {
		const saveSpy = vi.fn().mockRejectedValue(new Error('save offline'));
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: boolean[] = [];
		kernel.events.on('save:replayed', (event) => {
			replayed.push(event.ok);
		});

		await kernel.commands.save('all');
		const stored = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		stored[0].attempts = 8;
		window.localStorage.setItem(
			PENDING_SAVES_STORAGE_KEY,
			JSON.stringify(stored)
		);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});
		const afterNinthAttempt = JSON.parse(
			window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		);
		expect(afterNinthAttempt[0].attempts).toBe(9);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(2);
		});
		expect(replayed).toEqual([false, false]);
		expect(saveSpy).toHaveBeenCalledTimes(3);
		expect(window.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		kernel.dispose();
	});

	test('save queue is a no-op without window', async () => {
		const originalWindow = globalThis.window;
		vi.stubGlobal('window', undefined);
		const kernel = createConsentKernel({
			transport: {
				save: vi.fn().mockRejectedValue(new Error('save offline')),
			},
		});

		try {
			await expect(kernel.commands.save('all')).resolves.toEqual({ ok: false });
			expect(
				originalWindow.localStorage.getItem(PENDING_SAVES_STORAGE_KEY)
			).toBeNull();
		} finally {
			kernel.dispose();
			vi.stubGlobal('window', originalWindow);
		}
	});

	test('save queue ignores localStorage access errors', async () => {
		const originalWindow = globalThis.window;
		const throwingWindow = {
			addEventListener: originalWindow.addEventListener?.bind(originalWindow),
			get localStorage(): Storage {
				throw new Error('storage blocked');
			},
			removeEventListener:
				originalWindow.removeEventListener?.bind(originalWindow),
		};
		vi.stubGlobal('window', throwingWindow);
		const kernel = createConsentKernel({
			transport: {
				save: vi.fn().mockRejectedValue(new Error('save offline')),
			},
		});

		try {
			await expect(kernel.commands.save('all')).resolves.toEqual({ ok: false });
		} finally {
			kernel.dispose();
			vi.stubGlobal('window', originalWindow);
		}
	});
});

describe('kernel transport: identify forwards to transport', () => {
	test('identify calls transport.identify after updating snapshot', async () => {
		const identifySpy = vi.fn<NonNullable<KernelTransport['identify']>>();
		identifySpy.mockResolvedValue();
		const transport: KernelTransport = { identify: identifySpy };

		const kernel = createConsentKernel({
			initialSubjectId: 'sub-42',
			transport,
		});
		await kernel.commands.identify({ externalId: 'user-42' });

		expect(kernel.getSnapshot().user?.externalId).toBe('user-42');
		expect(identifySpy).toHaveBeenCalledTimes(1);
		expect(identifySpy).toHaveBeenCalledWith(
			{ externalId: 'user-42' },
			'sub-42'
		);
	});

	test('identify transport error emits command:error, rejects, and keeps the updated snapshot', async () => {
		const boom = new Error('identify failed');
		const transport: KernelTransport = {
			identify() {
				throw boom;
			},
		};
		const kernel = createConsentKernel({ transport });
		const errors: unknown[] = [];
		kernel.events.on('command:error', (e) => errors.push(e.error));

		await expect(
			kernel.commands.identify({ externalId: 'user-42' })
		).rejects.toBe(boom);

		expect(kernel.getSnapshot().user?.externalId).toBe('user-42');
		expect(errors).toEqual([boom]);
	});
});

// ---- createHostedTransport unit tests ------------------------------------

describe('createHostedTransport: request shape', () => {
	const backendURLToken = String.raw`\${backendURL}`;

	test(`init GETs \`${backendURLToken}/init\` with no body`, async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t/',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		const response = await transport.init?.({
			overrides: { country: 'DE' },
			user: { externalId: 'user-1' },
		});

		expect(response?.policy?.id).toBe('de-iab');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		// Trailing slash on backendURL is stripped.
		expect(url).toBe('https://api.example.com/c15t/init');
		expect((init as RequestInit).method).toBe('GET');
		expect((init as RequestInit).body).toBeUndefined();
	});

	test('identify PATCHes the current subject with the external identity', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ success: true }), { status: 200 })
			);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await transport.identify?.(
			{
				externalId: 'user-42',
				identityProvider: 'clerk',
				properties: { plan: 'pro' },
			},
			'subject/42'
		);

		expect(fetchSpy).toHaveBeenCalledWith(
			'/api/c15t/subjects/subject%2F42',
			expect.objectContaining({ method: 'PATCH' })
		);
		const [, init] = fetchSpy.mock.calls[0] ?? [];
		expect(JSON.parse((init as RequestInit).body as string)).toEqual({
			externalId: 'user-42',
			identityProvider: 'clerk',
		});
	});

	test('identify waits for the first save to establish a fresh subject', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true, subjectId: 'sub-created' }), {
				status: 200,
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const user = { externalId: 'user-42', identityProvider: 'clerk' };

		const identified = transport.identify?.(user, null);
		expect(fetchSpy).not.toHaveBeenCalled();

		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub-created',
			uiSource: 'banner',
			user,
		});

		await expect(identified).resolves.toBeUndefined();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/c15t/subjects');
	});

	test('identify PATCHes after a save establishes the subject', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true, subjectId: 'sub-created' }), {
				status: 200,
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		const identified = transport.identify?.({ externalId: 'user-42' }, null);
		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub-created',
			uiSource: 'banner',
			user: null,
		});

		await expect(identified).resolves.toBeUndefined();
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(fetchSpy.mock.calls[1]?.[0]).toBe('/api/c15t/subjects/sub-created');
	});

	test('initURL overrides init without changing the save endpoint', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), { status: 200 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/api/c15t/init',
		});

		await transport.init?.({ overrides: {}, user: null });
		await transport.save?.({
			consentAction: 'all',
			consents: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: 'snap-1',
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});

		expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
			'/api/c15t/init',
			'https://api.example.com/c15t/subjects',
		]);
	});

	test(`save POSTs to \`${backendURLToken}/subjects\` with backend body`, async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true, subjectId: 'sub-1' }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		const result = await transport.save?.({
			consentAction: 'all',
			consents: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			givenAt: 1_700_000_000_000,
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: 'snap-1',
			subjectId: 'sub_test',
			tcString: 'tc-1',
			uiSource: 'banner',
			user: {
				externalId: 'user-1',
				identityProvider: 'app',
				properties: { beta: true, plan: 'pro' },
			},
		});

		expect(result?.subjectId).toBe('sub-1');
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('/api/c15t/subjects');
		const body = JSON.parse((init as RequestInit).body as string);
		expect(body).toMatchObject({
			consentAction: 'all',
			domain: 'localhost',
			externalSubjectId: 'user-1',
			identityProvider: 'app',
			jurisdictionModel: 'opt-in',
			metadata: {
				userProperties: { beta: true, plan: 'pro' },
			},
			policySnapshotToken: 'snap-1',
			preferences: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			subjectId: 'sub_test',
			tcString: 'tc-1',
			type: 'cookie_banner',
			uiSource: 'banner',
		});
		expect(body.givenAt).toBe(1_700_000_000_000);
	});

	test('save stamps givenAt when the payload has none', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});

		const [, init] = fetchSpy.mock.calls[0] ?? [];
		const body = JSON.parse((init as RequestInit).body as string);
		expect(typeof body.givenAt).toBe('number');
		expect(body.policyId).toBeUndefined();
	});

	test('assertDecisionInputs binds token-less saves to the init decision', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), { status: 200 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			headers: { 'sec-gpc': '1' },
			initURL: '/internal/consent/init',
		});

		await transport.init?.({ overrides: {}, user: null });
		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'iab',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});

		expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
			'/internal/consent/init',
			'https://api.example.com/c15t/subjects',
		]);
		const [, saveInit] = fetchSpy.mock.calls[1] ?? [];
		expect(JSON.parse((saveInit as RequestInit).body as string)).toMatchObject({
			country: 'DE',
			fingerprint: 'policy-fingerprint',
			gpc: true,
			language: 'de',
			policyId: 'de-iab',
			region: 'BE',
		});
	});

	test.each([
		{ expected: false, headers: { 'sec-gpc': '0' }, label: 'sec-gpc: 0' },
		{ expected: undefined, headers: {}, label: 'no sec-gpc header' },
	])(
		'assertDecisionInputs maps $label to gpc',
		async ({ expected, headers }) => {
			const fetchSpy = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), { status: 200 })
				)
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ ok: true }), { status: 200 })
				);
			const transport = createHostedTransport({
				assertDecisionInputs: true,
				backendURL: '/api/c15t',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				headers,
			});

			await transport.init?.({ overrides: {}, user: null });
			await transport.save?.({
				consentAction: 'all',
				consents: { necessary: true },
				model: 'iab',
				overrides: {},
				policySnapshotToken: null,
				subjectId: 'sub_test',
				uiSource: 'banner',
				user: null,
			});

			const [, saveInit] = fetchSpy.mock.calls[1] ?? [];
			const body = JSON.parse((saveInit as RequestInit).body as string);
			expect(body.policyId).toBe('de-iab');
			expect(body.gpc).toBe(expected);
			expect('gpc' in body).toBe(expected !== undefined);
		}
	);

	test('init only forwards allowlisted backend input headers', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), { status: 200 })
			);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			headers: {
				'X-C15T-Region': 'BE',
				'accept-language': 'de-DE,de;q=0.9',
				authorization: 'Bearer t',
				cookie: 'session=secret',
				'sec-gpc': '1',
				'x-c15t-country': 'DE',
				'x-forwarded-for': '203.0.113.1',
			},
		});

		await transport.init?.({ overrides: {}, user: null });
		const [, init] = fetchSpy.mock.calls[0] ?? [];
		expect((init as RequestInit).headers).toEqual({
			accept: 'application/json',
			'accept-language': 'de-DE,de;q=0.9',
			'sec-gpc': '1',
			'x-c15t-country': 'DE',
			'x-c15t-region': 'BE',
			// Always attached by the transport itself, not consumer-forwarded.
			'x-c15t-version': expect.stringMatching(/^\d+\.\d+\.\d+/u),
		});
	});

	test('init maps backend InitOutput into the kernel init response shape', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			headers: { 'sec-gpc': '1' },
		});

		const response = await transport.init?.({ overrides: {}, user: null });

		expect(response).toMatchObject({
			branding: 'c15t',
			cmpId: 28,
			customVendors: [{ id: 'internal-analytics' }],
			gvl: { vendorListVersion: 42 },
			location: { countryCode: 'DE', regionCode: 'BE' },
			policy: { id: 'de-iab', model: 'iab' },
			policyDecision: {
				jurisdiction: 'GDPR',
				matchedBy: 'region',
				policyId: 'de-iab',
			},
			policySnapshotToken: 'snapshot-token',
			resolvedOverrides: {
				country: 'DE',
				gpc: true,
				language: 'de',
				region: 'BE',
			},
			translations: { language: 'de' },
		});
		expect('jurisdiction' in (response ?? {})).toBe(false);
	});

	test('init maps omitted backend GVL to null so IAB is disabled', async () => {
		const withoutIab = {
			...REALISTIC_INIT_OUTPUT,
			customVendors: undefined,
			gvl: undefined,
		};
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(withoutIab), { status: 200 })
			);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		const response = await transport.init?.({ overrides: {}, user: null });

		expect(response?.gvl).toBeNull();
	});

	test('non-2xx response throws an actionable error', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response('nope', { status: 500, statusText: 'Server Error' })
			);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await expect(
			transport.init?.({ overrides: {}, user: null })
		).rejects.toThrow(/\/init responded 500/u);
	});
});

describe('createManifestTransport: local init resolution', () => {
	test('resolves init from an inline manifest and lazily fetches GVL for IAB', async () => {
		const fetchGvl = vi.fn().mockResolvedValue(REALISTIC_INIT_OUTPUT.gvl);
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: vi.fn() as unknown as typeof globalThis.fetch,
			fetchGvl,
			inputs: {
				country: 'DE',
				gpc: true,
				language: 'de-DE,de;q=0.9',
				region: 'BE',
			},
			manifest: MANIFEST_FIXTURE,
		});

		const response = await transport.init?.({ overrides: {}, user: null });

		expect(response).toMatchObject({
			cmpId: 28,
			customVendors: [{ id: 'internal-analytics' }],
			gvl: { vendorListVersion: 42 },
			policy: { id: 'de-iab', model: 'iab' },
			policyDecision: {
				fingerprint: 'policy-fingerprint',
				matchedBy: 'region',
				policyId: 'de-iab',
			},
			resolvedOverrides: {
				country: 'DE',
				gpc: true,
				language: 'de',
				region: 'BE',
			},
		});
		expect(fetchGvl).toHaveBeenCalledWith({
			fetch: expect.any(Function),
			language: 'de',
			reference: { url: 'https://gvl.example.com', version: 42 },
		});
	});

	test('fetches manifestURL and sends asserted decision inputs on save', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(MANIFEST_FIXTURE), { status: 200 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true, subjectId: 'sub-1' }), {
					status: 200,
				})
			);
		const transport = createManifestTransport({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			fetchGvl: vi.fn().mockResolvedValue(null),
			inputs: {
				country: 'DE',
				gpc: true,
				language: 'de',
				region: 'BE',
			},
			manifestURL: 'https://api.example.com/c15t/manifest',
		});

		await transport.init?.({ overrides: {}, user: null });
		const result = await transport.save?.({
			consentAction: 'custom',
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			model: 'iab',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: {
				externalId: 'user-2',
				properties: { segment: 'docs' },
			},
		});

		expect(result).toEqual({ ok: true, subjectId: 'sub-1' });
		expect(fetchSpy).toHaveBeenNthCalledWith(
			1,
			'https://api.example.com/c15t/manifest',
			expect.objectContaining({ method: 'GET' })
		);
		const [subjectsUrl, subjectsInit] = fetchSpy.mock.calls[1] ?? [];
		expect(subjectsUrl).toBe('https://api.example.com/c15t/subjects');
		const body = JSON.parse((subjectsInit as RequestInit).body as string);
		expect(body).toMatchObject({
			country: 'DE',
			externalSubjectId: 'user-2',
			fingerprint: 'policy-fingerprint',
			gpc: true,
			language: 'de',
			metadata: {
				userProperties: { segment: 'docs' },
			},
			policyId: 'de-iab',
			preferences: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			region: 'BE',
			subjectId: 'sub_test',
		});
	});

	test('does not send asserted decision inputs when a snapshot token is present', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true, subjectId: 'sub-1' }), {
				status: 200,
			})
		);
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initialInit: REALISTIC_INIT_OUTPUT,
			inputs: {
				country: 'DE',
				gpc: true,
				language: 'de',
				region: 'BE',
			},
			manifest: MANIFEST_FIXTURE,
		});

		await transport.save?.({
			consentAction: 'custom',
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			model: 'iab',
			overrides: {},
			policySnapshotToken: 'snapshot-token',
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});

		const [, subjectsInit] = fetchSpy.mock.calls[0] ?? [];
		const body = JSON.parse((subjectsInit as RequestInit).body as string);
		expect(body).toMatchObject({
			policySnapshotToken: 'snapshot-token',
			subjectId: 'sub_test',
		});
		expect(body).not.toHaveProperty('policyId');
		expect(body).not.toHaveProperty('fingerprint');
		expect(body).not.toHaveProperty('country');
		expect(body).not.toHaveProperty('region');
		expect(body).not.toHaveProperty('language');
		expect(body).not.toHaveProperty('gpc');
	});

	test('does not send asserted decision inputs when the manifest resolved no policy pack', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true, subjectId: 'sub-1' }), {
				status: 200,
			})
		);
		const packlessManifest = {
			...MANIFEST_FIXTURE,
			iab: undefined,
			policyPacks: [],
		};
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			inputs: {
				country: null,
				gpc: undefined,
				language: 'en',
				region: null,
			},
			manifest: packlessManifest as never,
		});

		await transport.init?.({ overrides: {}, user: null });
		await transport.save?.({
			consentAction: 'custom',
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});

		const [, subjectsInit] = fetchSpy.mock.calls[0] ?? [];
		const body = JSON.parse((subjectsInit as RequestInit).body as string);
		expect(body).toMatchObject({ subjectId: 'sub_test' });
		// Partial inputs (country/language without policyId/fingerprint) are
		// rejected by the backend as incomplete — none may be sent.
		expect(body).not.toHaveProperty('policyId');
		expect(body).not.toHaveProperty('fingerprint');
		expect(body).not.toHaveProperty('country');
		expect(body).not.toHaveProperty('region');
		expect(body).not.toHaveProperty('language');
		expect(body).not.toHaveProperty('gpc');
	});
});

describe('x-c15t-version header (issue #916)', () => {
	test('hosted init and save carry the client version', async () => {
		// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
		const fetchSpy = vi.fn(async (url: RequestInfo | URL) => {
			const s = String(url);
			if (s.endsWith('/init')) {
				return new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				});
			}
			return new Response(JSON.stringify({ ok: true }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			});
		});
		const kernel = createConsentKernel({
			transport: createHostedTransport({
				backendURL: 'https://backend.example',
				fetch: fetchSpy as unknown as typeof fetch,
			}),
		});

		await kernel.commands.init();
		await kernel.commands.save('all');

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		for (const call of fetchSpy.mock.calls) {
			const headers = (call[1] as RequestInit).headers as Record<
				string,
				string
			>;
			expect(headers['x-c15t-version']).toMatch(/^\d+\.\d+\.\d+/u);
		}
	});

	test('manifest fetch and save both carry the client version', async () => {
		// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
		const fetchSpy = vi.fn(async (url: RequestInfo | URL) => {
			const s = String(url);
			if (s.endsWith('/manifest')) {
				return new Response(JSON.stringify(MANIFEST_FIXTURE), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				});
			}
			return new Response(JSON.stringify({ ok: true }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			});
		});
		const kernel = createConsentKernel({
			transport: createManifestTransport({
				backendURL: 'https://backend.example',
				fetch: fetchSpy as unknown as typeof fetch,
				inputs: { country: 'DE', language: 'de', region: 'BE' },
				manifestURL: 'https://cdn.example/manifest',
			}),
		});

		await kernel.commands.init();
		await kernel.commands.save('all');

		const manifestCall = fetchSpy.mock.calls.find((c) =>
			String(c[0]).endsWith('/manifest')
		);
		const saveCall = fetchSpy.mock.calls.find((c) =>
			String(c[0]).endsWith('/subjects')
		);
		expect(manifestCall).toBeDefined();
		expect(saveCall).toBeDefined();

		const manifestHeaders = ((manifestCall?.[1] as RequestInit)?.headers ??
			{}) as Record<string, string>;
		// The manifest/GVL hosts are c15t/tenant-controlled (IAB requires
		// self-hosting the GVL), so version telemetry rides here too.
		expect(manifestHeaders['x-c15t-version']).toMatch(/^\d+\.\d+\.\d+/u);

		expect(saveCall?.[1]).toBeDefined();
		const saveInit = saveCall?.[1] as RequestInit;
		const saveHeaders = saveInit.headers as Record<string, string>;
		expect(saveHeaders['x-c15t-version']).toMatch(/^\d+\.\d+\.\d+/u);
	});
});

describe('hosted transport: initialData', () => {
	test('consumes a prefetched init once and keeps the decision assertion', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), { status: 200 })
			);
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			headers: { 'sec-gpc': '1' },
			initURL: '/internal/consent/init',
			initialData: Promise.resolve({ init: REALISTIC_INIT_OUTPUT }),
		});

		const first = await transport.init?.({ overrides: {}, user: null });
		expect(first?.policy?.id).toBe(REALISTIC_INIT_OUTPUT.policy.id);
		expect(fetchSpy).not.toHaveBeenCalled();

		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'iab',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});
		const [saveURL, saveInit] = fetchSpy.mock.calls[0] ?? [];
		expect(saveURL).toBe('https://api.example.com/c15t/subjects');
		expect(JSON.parse((saveInit as RequestInit).body as string)).toMatchObject({
			country: 'DE',
			fingerprint: 'policy-fingerprint',
			gpc: true,
			policyId: 'de-iab',
		});

		// The second init goes to the network: the prefetch is single-use.
		await transport.init?.({ overrides: {}, user: null });
		expect(fetchSpy.mock.calls[1]?.[0]).toBe('/internal/consent/init');
	});

	test('falls back to the fetch when the prefetch resolved empty or rejected', async () => {
		for (const initialData of [
			Promise.resolve(undefined),
			Promise.reject(new Error('offline')),
		]) {
			const fetchSpy = vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), { status: 200 })
				);
			const transport = createHostedTransport({
				backendURL: 'https://api.example.com/c15t',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				initialData,
			});
			// oxlint-disable-next-line no-await-in-loop -- sequential cases keep the failing input readable.
			await transport.init?.({ overrides: {}, user: null });
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		}
	});
});

describe('hosted transport: GPC in decision assertions', () => {
	test('uses the GPC value the resolver reported when no explicit header is configured', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						...REALISTIC_INIT_OUTPUT,
						resolvedOverrides: {
							...REALISTIC_INIT_OUTPUT.resolvedOverrides,
							gpc: true,
						},
					}),
					{ status: 200 }
				)
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/api/c15t/init',
		});

		await transport.init?.({ overrides: {}, user: null });
		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'iab',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});

		const [, saveInit] = fetchSpy.mock.calls[1] ?? [];
		expect(JSON.parse((saveInit as RequestInit).body as string)).toMatchObject({
			gpc: true,
			policyId: 'de-iab',
		});
	});
});

describe('hosted transport: init context', () => {
	test('sends the kernel overrides as canonical consent headers on init', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), { status: 200 })
			);
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/api/c15t/init',
		});

		const result = await transport.init?.({
			overrides: { country: 'FR', gpc: true, language: 'fr', region: 'IDF' },
			user: null,
		});
		// A backend that echoes nothing back still yields the requested GPC.
		expect(result?.resolvedOverrides?.gpc).toBe(true);

		const [, init] = fetchSpy.mock.calls[0] ?? [];
		expect((init as RequestInit).headers).toMatchObject({
			'accept-language': 'fr',
			'x-c15t-country': 'FR',
			'x-c15t-gpc': '1',
			'x-c15t-region': 'IDF',
		});
		// Scripts cannot set Sec-* headers; the override must not try.
		expect((init as RequestInit).headers).not.toHaveProperty('sec-gpc');
	});
});

describe('hosted transport: decisionInputs seed', () => {
	test('a save before init resolves still carries the seeded assertion', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			decisionInputs: {
				country: 'DE',
				fingerprint: 'seeded-fingerprint',
				gpc: false,
				language: 'de',
				policyId: 'de-seeded',
				region: null,
			},
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/internal/consent/init',
		});

		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});
		const [, saveInit] = fetchSpy.mock.calls[0] ?? [];
		expect(JSON.parse((saveInit as RequestInit).body as string)).toMatchObject({
			country: 'DE',
			fingerprint: 'seeded-fingerprint',
			language: 'de',
			policyId: 'de-seeded',
		});
	});

	test('the seed is ignored without assertDecisionInputs', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t',
			decisionInputs: {
				country: 'DE',
				fingerprint: 'seeded-fingerprint',
				language: 'de',
				policyId: 'de-seeded',
				region: null,
			},
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		await transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});
		const [, saveInit] = fetchSpy.mock.calls[0] ?? [];
		expect(
			JSON.parse((saveInit as RequestInit).body as string)
		).not.toHaveProperty('policyId');
	});
});

describe('hosted transport: save waits for an in-flight init', () => {
	test('a save issued while init is pending carries that init decision', async () => {
		const initGate = Promise.withResolvers<undefined>();
		const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
			if (url.endsWith('/init')) {
				await initGate.promise;
				return new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), {
					status: 200,
				});
			}
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		});
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/internal/consent/init',
		});

		const initPromise = transport.init?.({ overrides: {}, user: null });
		const savePromise = transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});
		await Promise.resolve();
		expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
			'/internal/consent/init',
		]);

		initGate.resolve(undefined);
		await Promise.all([initPromise, savePromise]);
		const saveCall = fetchSpy.mock.calls.find(([url]) =>
			String(url).endsWith('/subjects')
		);
		if (!saveCall) {
			throw new Error('save was not sent');
		}
		expect(
			JSON.parse((saveCall[1] as RequestInit).body as string)
		).toMatchObject({
			fingerprint: 'policy-fingerprint',
			policyId: 'de-iab',
		});
	});
});

describe('hosted transport: assertion state across overlapping inits', () => {
	const savePayload = {
		consentAction: 'all',
		consents: { necessary: true },
		model: 'opt-in',
		overrides: {},
		policySnapshotToken: null,
		subjectId: 'sub_test',
		uiSource: 'banner',
		user: null,
	} as const;

	test('an older init finishing last does not overwrite the newer decision', async () => {
		const gates = [
			Promise.withResolvers<undefined>(),
			Promise.withResolvers<undefined>(),
		];
		let initCalls = 0;
		const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
			if (url.endsWith('/init')) {
				const index = initCalls;
				initCalls += 1;
				await gates[index]?.promise;
				return new Response(
					JSON.stringify({
						...REALISTIC_INIT_OUTPUT,
						policyDecision: {
							...REALISTIC_INIT_OUTPUT.policyDecision,
							fingerprint: `fp-${index}`,
							policyId: `policy-${index}`,
						},
					}),
					{ status: 200 }
				);
			}
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		});
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/internal/consent/init',
		});

		const first = transport.init?.({
			overrides: { country: 'DE' },
			user: null,
		});
		const second = transport.init?.({
			overrides: { country: 'FR' },
			user: null,
		});
		gates[1]?.resolve(undefined);
		await second;
		gates[0]?.resolve(undefined);
		await first;

		await transport.save?.(savePayload);
		const saveCall = fetchSpy.mock.calls.find(([url]) =>
			String(url).endsWith('/subjects')
		);
		if (!saveCall) {
			throw new Error('save was not sent');
		}
		expect(
			JSON.parse((saveCall[1] as RequestInit).body as string)
		).toMatchObject({ fingerprint: 'fp-1', policyId: 'policy-1' });
	});

	test('a save refuses to post unbound when the awaited init failed', async () => {
		const fetchSpy = vi.fn().mockImplementation((url: string) => {
			if (url.endsWith('/init')) {
				return Promise.resolve(new Response('nope', { status: 503 }));
			}
			return Promise.resolve(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		});
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/internal/consent/init',
		});

		const initPromise = transport.init?.({ overrides: {}, user: null });
		const savePromise = transport.save?.(savePayload);
		await expect(initPromise).rejects.toThrow();
		await expect(savePromise).rejects.toThrow(/policy decision/u);
		expect(
			fetchSpy.mock.calls.some(([url]) => String(url).endsWith('/subjects'))
		).toBe(false);
	});
});

describe('hosted transport: re-init with different inputs', () => {
	const savePayload = {
		consentAction: 'all',
		consents: { necessary: true },
		model: 'opt-in',
		overrides: {},
		policySnapshotToken: null,
		subjectId: 'sub_test',
		uiSource: 'banner',
		user: null,
	} as const;

	const createGatedInit = function createGatedInit() {
		const gates: PromiseWithResolvers<undefined>[] = [];
		let initCalls = 0;
		const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
			if (url.endsWith('/init')) {
				const index = initCalls;
				initCalls += 1;
				const gate = Promise.withResolvers<undefined>();
				gates.push(gate);
				await gate.promise;
				return new Response(
					JSON.stringify({
						...REALISTIC_INIT_OUTPUT,
						policyDecision: {
							...REALISTIC_INIT_OUTPUT.policyDecision,
							fingerprint: `fp-${index}`,
							policyId: `policy-${index}`,
						},
					}),
					{ status: 200 }
				);
			}
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		});
		return { fetchSpy, gates };
	};

	const savedAssertion = function savedAssertion(
		fetchSpy: ReturnType<typeof vi.fn>
	) {
		const saveCall = fetchSpy.mock.calls.find(([url]) =>
			String(url).endsWith('/subjects')
		);
		if (!saveCall) {
			throw new Error('save was not sent');
		}
		return JSON.parse((saveCall[1] as RequestInit).body as string);
	};

	test('a save during a re-init for other inputs waits for the new decision', async () => {
		const { fetchSpy, gates } = createGatedInit();
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/internal/consent/init',
		});
		const first = transport.init?.({
			overrides: { country: 'DE' },
			user: null,
		});
		await vi.waitFor(() => expect(gates).toHaveLength(1));
		gates[0]?.resolve(undefined);
		await first;

		const second = transport.init?.({
			overrides: { country: 'FR' },
			user: null,
		});
		const save = transport.save?.(savePayload);
		await vi.waitFor(() => expect(gates).toHaveLength(2));
		expect(
			fetchSpy.mock.calls.some(([url]) => String(url).endsWith('/subjects'))
		).toBe(false);
		gates[1]?.resolve(undefined);
		await Promise.all([second, save]);
		expect(savedAssertion(fetchSpy)).toMatchObject({ policyId: 'policy-1' });
	});

	test('a save waiting on one init also waits for a newer one started meanwhile', async () => {
		const { fetchSpy, gates } = createGatedInit();
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/internal/consent/init',
		});
		const first = transport.init?.({
			overrides: { country: 'DE' },
			user: null,
		});
		const save = transport.save?.(savePayload);
		await vi.waitFor(() => expect(gates).toHaveLength(1));
		const second = transport.init?.({
			overrides: { country: 'FR' },
			user: null,
		});
		await vi.waitFor(() => expect(gates).toHaveLength(2));
		gates[0]?.resolve(undefined);
		await first;
		gates[1]?.resolve(undefined);
		await Promise.all([second, save]);
		expect(savedAssertion(fetchSpy)).toMatchObject({ policyId: 'policy-1' });
	});
});

describe('hosted transport: removing an override', () => {
	test('drops the remembered decision so a failed re-init refuses the save', async () => {
		let initCalls = 0;
		const fetchSpy = vi.fn().mockImplementation((url: string) => {
			if (url.endsWith('/init')) {
				initCalls += 1;
				return Promise.resolve(
					initCalls === 1
						? new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), {
								status: 200,
							})
						: new Response('nope', { status: 503 })
				);
			}
			return Promise.resolve(
				new Response(JSON.stringify({ ok: true }), { status: 200 })
			);
		});
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/internal/consent/init',
		});
		await transport.init?.({ overrides: { country: 'DE' }, user: null });
		const reinit = transport.init?.({ overrides: {}, user: null });
		const save = transport.save?.({
			consentAction: 'all',
			consents: { necessary: true },
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});
		await expect(reinit).rejects.toThrow();
		await expect(save).rejects.toThrow(/policy decision/u);
		expect(
			fetchSpy.mock.calls.some(([url]) => String(url).endsWith('/subjects'))
		).toBe(false);
	});
});
