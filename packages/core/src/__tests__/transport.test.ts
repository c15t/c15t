/**
 * Transport + commands.init / commands.save tests.
 *
 * These verify the pluggable transport wiring without hitting a real
 * backend. createHostedTransport is also unit-tested against a mocked
 * fetch so we know the request shape and error handling are correct.
 */
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createHostedTransport, isConsentSaveRejection } from '../index';
import type { InitResponse, KernelConfig, KernelTransport } from '../index';
import { createKernel } from '../kernel';
import { createMemoryOutboxStore } from '../kernel/save-outbox';
import { createManifestTransport } from '../transports/manifest';
import {
	choiceRecords,
	explicitChoice,
	matchedResolution,
	optInRule,
	iabRule,
} from './fixtures/kernel-fixtures';

/**
 * A kernel with its own in-memory save outbox, so a save one test fails
 * never replays in another.
 */
const createConsentKernel = function createConsentKernel(
	config: KernelConfig = {}
) {
	return createKernel(config, { outboxStore: createMemoryOutboxStore() });
};

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

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
	location: { countryCode: 'DE', regionCode: 'BE' },
	policyResolution: {
		...matchedResolution(
			iabRule({ id: 'de-iab', scopeMode: 'strict' }),
			'region'
		),
		version: 1,
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
			consentGate: {
				actionButton: 'Einstellungen oeffnen',
				title: 'Cookie-Einstellungen',
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
		customVendors: [
			{
				id: 'internal-analytics',
				name: 'Internal analytics',
				privacyPolicyUrl: 'https://example.com/privacy',
				purposes: [1],
			},
		],
		enabled: true,
		gvl: { url: 'https://gvl.example.com', version: 42 },
	},
	policyPacks: [
		createConsentManifestPolicyPack({
			categories: ['*'],
			i18n: { language: 'de', messageProfile: 'formal' },
			id: 'de-iab',
			match: { regions: [{ country: 'DE', region: 'BE' }] },
			model: 'iab',
			privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
			prompt: 'choice',
			scopeMode: 'strict',
			validity: { choiceDays: 180 },
		}),
	],
	revision: 'manifest-revision',
	schemaVersion: 2,
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
			expect(
				Object.keys(kernel.getSnapshot().explicitChoice?.categories ?? {})
			).not.toHaveLength(0);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('kernel transport: init applies response to snapshot', () => {
	test('legacy jurisdiction + showConsentBanner init fields are ignored', async () => {
		const transport: KernelTransport = {
			init() {
				return Promise.resolve({
					jurisdiction: 'GDPR',
					showConsentBanner: true,
				} as InitResponse);
			},
		};
		const kernel = createConsentKernel({ transport });

		expect(kernel.getSnapshot().model).toBe('opt-in');
		expect(kernel.getSnapshot().resolution.status).toBe('unconfigured');

		await kernel.commands.init();

		// A complete response without any policy field is a malformed init:
		// failed, strict opt-in permissions, first layer hidden.
		expect(kernel.getSnapshot().model).toBe('opt-in');
		expect(kernel.getSnapshot().resolution).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('resolvedOverrides merge into snapshot.overrides', async () => {
		const transport: KernelTransport = {
			init() {
				return Promise.resolve({
					resolvedOverrides: { country: 'DE', region: 'BE' },
				});
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

	test('legacy server booleans cannot seed a draft or a choice', async () => {
		const transport: KernelTransport = {
			init() {
				return Promise.resolve({
					consents: { marketing: true, measurement: true },
					hasConsented: true,
				} as unknown as InitResponse);
			},
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();

		const snap = kernel.getSnapshot();
		// Booleans without receipts cannot be an explicit choice.
		expect(snap.explicitChoice).toBeNull();
		expect(snap.explicitChoice).toBeNull();
		expect(snap.effectivePermissions.marketing).toBe(false);

		// Missing receipts cannot preselect a later explicit confirmation.
		await kernel.commands.save();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.experience).toBe(false);
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
				return Promise.resolve({});
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
		// Failure is observable, permissions stay safe, first layer hidden.
		expect(kernel.getSnapshot().resolution).toEqual({
			policy: null,
			reason: 'transport',
			status: 'failed',
		});
		expect(kernel.getSnapshot().model).toBe('opt-in');
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('provisional policy suppresses activeUI until init resolves', async () => {
		let resolveInit: (value: InitResponse) => void = () => {};
		const transport: KernelTransport = {
			init() {
				return new Promise((resolve) => {
					resolveInit = resolve;
				});
			},
		};
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			transport,
		});

		// Model is populated for SSR ergonomics, but no surface renders.
		expect(kernel.getSnapshot().model).toBe('opt-in');
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(kernel.getSnapshot().policyPending).toBe(true);

		const pending = kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('none');

		resolveInit({
			policyResolution: { ...matchedResolution(optInRule()), version: 1 },
		});
		await pending;

		expect(kernel.getSnapshot().policyPending).toBe(false);
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
			initialPolicyPending: true,
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
		expect(kernel.getSnapshot().policyPending).toBe(true);
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
			.mockResolvedValue({
				policyResolution: { ...matchedResolution(optInRule()), version: 1 },
			});
		const kernel = createConsentKernel({
			initRetry: { baseDelayMs: 100, maxAttempts: 3, maxDelayMs: 1000 },
			initialPolicyPending: true,
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
		expect(kernel.getSnapshot().policyPending).toBe(false);
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
			.mockImplementationOnce(
				() =>
					new Promise<InitResponse>((resolve) => {
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
			.mockImplementationOnce(
				() =>
					new Promise<InitResponse>((_resolve, reject) => {
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
		const resolution = matchedResolution(optInRule());
		const kernel = createConsentKernel({
			initialPolicyResolution: resolution,
			transport: {
				init() {
					return Promise.resolve({
						policyResolution: { ...resolution, version: 1 },
					});
				},
			},
		});
		const server = kernel.getServerSnapshot();
		expect(server.revision).toBe(0);
		expect(server.activeUI).toBe('banner');

		// Simulate the client boot mutations that land before hydration
		// completes: persistence hydrate applies a stored full choice…
		kernel.hydrate(
			choiceRecords(
				{
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
				},
				{ fingerprint: resolution.fingerprints.choice, now: Date.now() }
			)
		);
		await kernel.commands.init();

		// …but hydration must still be able to render what the server saw.
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(kernel.getServerSnapshot()).toBe(server);
		expect(kernel.getServerSnapshot().activeUI).toBe('banner');
	});

	test('provisional policy finalizes when the transport has no init', async () => {
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			transport: {},
		});

		expect(kernel.getSnapshot().activeUI).toBe('none');
		await kernel.commands.init();
		expect(kernel.getSnapshot().policyPending).toBe(false);
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
		const first = kernel.getSnapshot().subject?.subjectId ?? null;
		await kernel.commands.save({ marketing: false });
		const second = kernel.getSnapshot().subject?.subjectId ?? null;

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
		expect(
			Object.keys(kernel.getSnapshot().explicitChoice?.categories ?? {})
		).not.toHaveLength(0);
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
		expect(
			Object.keys(kernel.getSnapshot().explicitChoice?.categories ?? {})
		).not.toHaveLength(0);
	});
});

describe('hosted transport: save refusals', () => {
	const payload = {
		choice: {
			categories: {
				marketing: {
					basis: { fingerprint: 'fp', kind: 'choice-v1' },
					confirmedAt: 1,
					value: true,
				},
			},
			version: 3,
		},
		confirmed: { actionAt: 1, categories: { marketing: true } },
		consentAction: 'all',
		consents: { marketing: true, necessary: true },
		givenAt: 1,
		model: 'opt-in',
		overrides: {},
		policySnapshotToken: 'token',
		subjectId: 'sub_refusal',
		uiSource: 'banner',
		user: null,
	} as unknown as Parameters<
		ReturnType<typeof createHostedTransport>['save']
	>[0];

	const respond = (status: number, cause?: Record<string, string>) =>
		(() =>
			Promise.resolve(
				Response.json({ cause, message: 'refused' }, { status })
			)) as unknown as typeof globalThis.fetch;

	const answer = (status: number, cause?: Record<string, string>) =>
		createHostedTransport({
			backendURL: 'https://backend.test',
			domain: 'example.com',
			fetch: respond(status, cause),
		});

	test.each([
		[409, 'CONFLICT'],
		[409, 'SUBJECT_CONFLICT'],
		[409, 'POLICY_SNAPSHOT_EXPIRED'],
	])(
		'the manifest transport also refuses %i %s for good',
		async (status, code) => {
			// Both transports throw through `saveFailure`; this keeps the manifest
			// one from drifting to a retryable error the kernel would replay.
			const transport = createManifestTransport({
				backendURL: 'https://backend.test',
				domain: 'example.com',
				fetch: respond(status, { code }),
				manifest: MANIFEST_FIXTURE,
			});
			const error = await transport
				.save(payload)
				.catch((caught: unknown) => caught);
			expect(isConsentSaveRejection(error)).toBe(true);
			expect(error).toMatchObject({ code, status });
		}
	);

	test('the manifest transport keeps a 500 retryable', async () => {
		const transport = createManifestTransport({
			backendURL: 'https://backend.test',
			domain: 'example.com',
			fetch: respond(500, { code: 'DATABASE_ERROR' }),
			manifest: MANIFEST_FIXTURE,
		});
		const error = await transport
			.save(payload)
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(Error);
		expect(isConsentSaveRejection(error)).toBe(false);
	});

	test.each([
		[409, 'POLICY_SNAPSHOT_EXPIRED', undefined],
		[409, 'POLICY_SNAPSHOT_INVALID', undefined],
		[409, 'POLICY_SNAPSHOT_REQUIRED', undefined],
		[422, 'STALE_POLICY', 'policy-changed'],
		[409, 'CONFLICT', undefined],
		[409, 'SUBJECT_CONFLICT', undefined],
	])(
		'%i %s is a refusal the kernel does not retry',
		async (status, code, reason) => {
			const cause: Record<string, string> = { code };
			if (reason) {
				cause.reason = reason;
			}
			const error = await answer(status, cause)
				.save(payload)
				.catch((caught: unknown) => caught);
			expect(isConsentSaveRejection(error)).toBe(true);
			expect(error).toMatchObject({ code, reason, status });
		}
	);

	test.each([
		[400, { code: 'INPUT_VALIDATION_FAILED' }],
		[409, { code: 'SOMETHING_ELSE' }],
		[500, { code: 'DATABASE_ERROR' }],
		[503, undefined],
	])('%i stays retryable', async (status, cause) => {
		const error = await answer(status, cause)
			.save(payload)
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(Error);
		expect(isConsentSaveRejection(error)).toBe(false);
	});
});

describe('kernel transport: identify forwards to transport', () => {
	test('identify calls transport.identify after updating snapshot', async () => {
		const identifySpy = vi.fn<NonNullable<KernelTransport['identify']>>();
		identifySpy.mockResolvedValue();
		const transport: KernelTransport = { identify: identifySpy };

		const kernel = createConsentKernel({
			initialRecords: { subject: { subjectId: 'sub-42' } },
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

		expect(response?.policyResolution?.policy?.id).toBe('de-iab');
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

	test('identify without a server subject resolves at once and sends nothing', async () => {
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

		// Kernel-local identity: no pending promise waits for a subject that
		// may never be created, so a later clear has nothing to cancel.
		await expect(transport.identify(user, null)).resolves.toBeUndefined();
		expect(fetchSpy).not.toHaveBeenCalled();

		// The next legitimate save carries the identity; the backend links it
		// when it creates the subject.
		await transport.save({
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 0, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub-created' },
			subjectId: 'sub-created',
			uiSource: 'banner',
			user,
		});
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('/api/c15t/subjects');
		expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
			externalSubjectId: 'user-42',
			identityProvider: 'clerk',
		});
	});

	test('the subject the kernel passes is the only subject the transport acts on', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true, subjectId: 'sub-created' }), {
				status: 200,
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await transport.save({
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 0, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub-created' },
			subjectId: 'sub-created',
			uiSource: 'banner',
			user: null,
		});
		// After the kernel cleared its data it passes no subject. The transport
		// must not reach the subject that earlier save established.
		await transport.identify({ externalId: 'user-42' }, null);
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		// With the kernel's real subject it links exactly that subject.
		await transport.identify({ externalId: 'user-42' }, 'sub-created');
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		const [, patchCall] = fetchSpy.mock.calls;
		const [patchUrl, patchInit] = patchCall ?? [];
		expect(patchUrl).toBe('/api/c15t/subjects/sub-created');
		expect((patchInit as RequestInit).method).toBe('PATCH');
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 0, categories: {} },
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
			subject: { subjectId: 'sub_test' },
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

		const values = {
			experience: true,
			functionality: true,
			marketing: true,
			measurement: true,
		};
		const actionAt = 1_700_000_000_000;
		const result = await transport.save?.({
			choice: explicitChoice(values, { confirmedAt: actionAt, legacy: true }),
			confirmed: { actionAt, categories: values },
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
			subject: { subjectId: 'sub_test' },
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
			metadata: {
				userProperties: { beta: true, plan: 'pro' },
			},
			model: 'opt-in',
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
		expect(body).not.toHaveProperty('jurisdictionModel');
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 0, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 0, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
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
			fingerprint: REALISTIC_INIT_OUTPUT.policyResolution.fingerprints.policy,
			gpc: true,
			language: 'de',
			policyId: 'de-iab',
			region: 'BE',
		});
	});

	test.each([
		{ expected: false, headers: { 'sec-gpc': '0' }, label: 'sec-gpc: 0' },
		{
			expected: undefined,
			headers: {} as Record<string, string>,
			label: 'no sec-gpc header',
		},
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
				choice: { categories: {}, version: 3 },
				confirmed: { actionAt: 0, categories: {} },
				consentAction: 'all',
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
				subject: { subjectId: 'sub_test' },
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
			// Always attached by the transport itself, not consumer-forwarded.
			'x-c15t-policy-contract': '1',
			'x-c15t-region': 'BE',
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
			policyResolution: {
				policy: { id: 'de-iab', model: 'iab' },
				status: 'matched',
			},
			policySnapshotToken: 'snapshot-token',
			resolvedOverrides: {
				country: 'DE',
				language: 'de',
				region: 'BE',
			},
			// The detected header signal, kept apart from developer overrides.
			resolvedPrivacySignals: { gpc: true },
			translations: { language: 'de' },
		});
		expect(response?.resolvedOverrides).not.toHaveProperty('gpc');
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
	test.each([false, true])(
		'retains a custom GVL fetch result without a route (defer=%s)',
		async (deferGvl) => {
			const list = REALISTIC_INIT_OUTPUT.gvl;
			const fetchGvl = vi.fn().mockResolvedValue(list);
			const transport = createManifestTransport({
				backendURL: 'https://api.example.com/c15t',
				deferGvl,
				fetchGvl,
				inputs: { country: 'DE', region: 'BE' },
				manifest: MANIFEST_FIXTURE,
			});
			const response = await transport.init?.({ overrides: {}, user: null });
			expect(response?.gvl).toBe(list);
			expect(response?.gvlReference).toBeUndefined();
			expect(fetchGvl).toHaveBeenCalledTimes(1);
		}
	);

	test('resolves init from an inline manifest and lazily fetches GVL for IAB', async () => {
		const fetchGvl = vi.fn().mockResolvedValue(REALISTIC_INIT_OUTPUT.gvl);
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: vi.fn() as unknown as typeof globalThis.fetch,
			fetchGvl,
			gvlRoute: '/api/c15t/init',
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
			gvl: null,
			gvlReference: {
				language: 'de',
				url: '/api/c15t/init?c15t-gvl=42&language=de',
				vendorListVersion: 42,
			},
			policyResolution: {
				policy: { id: 'de-iab', model: 'iab' },
				status: 'matched',
			},
			resolvedOverrides: {
				country: 'DE',
				language: 'de',
				region: 'BE',
			},
			resolvedPrivacySignals: { gpc: true },
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
		const values = {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
		};
		const actionAt = 1_700_000_000_000;
		const result = await transport.save?.({
			choice: explicitChoice(values, { confirmedAt: actionAt, legacy: true }),
			confirmed: { actionAt, categories: values },
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
			subject: { subjectId: 'sub_test' },
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
			fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u),
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 0, categories: {} },
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
			subject: { subjectId: 'sub_test' },
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

	test('explicitly asserts no-match when the configured manifest contains no policy packs', async () => {
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 0, categories: {} },
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
			subject: { subjectId: 'sub_test' },
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});

		const [, subjectsInit] = fetchSpy.mock.calls[0] ?? [];
		const body = JSON.parse((subjectsInit as RequestInit).body as string);
		expect(body).toMatchObject({ subjectId: 'sub_test' });
		// Null distinguishes a successful no-match from missing decision inputs.
		expect(body).toMatchObject({
			country: null,
			language: 'de',
			policyId: null,
			region: null,
		});
		expect(body).not.toHaveProperty('fingerprint');
		expect(body).not.toHaveProperty('gpc');
	});
});

describe('x-c15t-experiment header', () => {
	test('hosted init carries the arm while the visitor has no stored choice', async () => {
		const fetchSpy = vi.fn(
			// oxlint-disable-next-line require-await -- Match the asynchronous fetch contract.
			async (_url: RequestInfo | URL, _init?: RequestInit) =>
				new Response(JSON.stringify(REALISTIC_INIT_OUTPUT), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
		);
		const kernel = createConsentKernel({
			initialExperiment: {
				acknowledgedDiagnostics: false,
				arm: 'wall',
				assignedBy: 'host',
				id: 'banner shape',
			},
			transport: createHostedTransport({
				backendURL: 'https://backend.example',
				fetch: fetchSpy as unknown as typeof fetch,
			}),
		});
		await kernel.commands.init();
		const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<
			string,
			string
		>;
		expect(headers['x-c15t-experiment']).toBe('banner%20shape=wall');
		kernel.dispose();
	});
});

describe('x-c15t-version header (issue #916)', () => {
	test('hosted init and save carry the client version', async () => {
		const fetchSpy = vi.fn(
			// oxlint-disable-next-line require-await -- Match the asynchronous fetch contract.
			async (url: RequestInfo | URL, _init?: RequestInit) => {
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
			}
		);
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
		const fetchSpy = vi.fn(
			// oxlint-disable-next-line require-await -- Match the asynchronous fetch contract.
			async (url: RequestInfo | URL, _init?: RequestInit) => {
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
			}
		);
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
		expect(first?.policyResolution).toMatchObject({
			policyId: REALISTIC_INIT_OUTPUT.policyResolution.policyId,
		});
		expect(fetchSpy).not.toHaveBeenCalled();

		await transport.save?.({
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 1700000000000, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
			subjectId: 'sub_test',
			uiSource: 'banner',
			user: null,
		});
		const [saveURL, saveInit] = fetchSpy.mock.calls[0] ?? [];
		expect(saveURL).toBe('https://api.example.com/c15t/subjects');
		expect(JSON.parse((saveInit as RequestInit).body as string)).toMatchObject({
			country: 'DE',
			fingerprint: REALISTIC_INIT_OUTPUT.policyResolution.fingerprints.policy,
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 1700000000000, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 1700000000000, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 1700000000000, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 1700000000000, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
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
			fingerprint: REALISTIC_INIT_OUTPUT.policyResolution.fingerprints.policy,
			policyId: 'de-iab',
		});
	});
});

describe('hosted transport: assertion state across overlapping inits', () => {
	const savePayload = {
		choice: { categories: {}, version: 3 },
		confirmed: { actionAt: 1700000000000, categories: {} },
		consentAction: 'all',
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
		subject: { subjectId: 'sub_test' },
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
						policyResolution: {
							...REALISTIC_INIT_OUTPUT.policyResolution,
							fingerprints: {
								...REALISTIC_INIT_OUTPUT.policyResolution.fingerprints,
								policy: `fp-${index}`,
							},
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
		choice: { categories: {}, version: 3 },
		confirmed: { actionAt: 1700000000000, categories: {} },
		consentAction: 'all',
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
		subject: { subjectId: 'sub_test' },
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
						policyResolution: {
							...REALISTIC_INIT_OUTPUT.policyResolution,
							fingerprints: {
								...REALISTIC_INIT_OUTPUT.policyResolution.fingerprints,
								policy: `fp-${index}`,
							},
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
			choice: { categories: {}, version: 3 },
			confirmed: { actionAt: 1700000000000, categories: {} },
			consentAction: 'all',
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
			subject: { subjectId: 'sub_test' },
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

describe('consent journey query parameters', () => {
	const JOURNEY_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
	const savePayload = {
		choice: { categories: {}, version: 3 },
		confirmed: { actionAt: 1_700_000_000_000, categories: {} },
		consentAction: 'all',
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
		subject: { subjectId: 'sub_test' },
		subjectId: 'sub_test',
		uiSource: 'banner',
		user: null,
	} as const;
	const respond = () =>
		vi.fn(
			// oxlint-disable-next-line require-await -- Match the asynchronous fetch contract.
			async (url: RequestInfo | URL, _init?: RequestInit) =>
				new Response(
					JSON.stringify(
						String(url).includes('/init?') || String(url).endsWith('/init')
							? REALISTIC_INIT_OUTPUT
							: { subjectId: 'sub_test' }
					),
					{ status: 200 }
				)
		);

	test('hosted init carries the journey, its scope and the stored flag', async () => {
		const fetchSpy = respond();
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof fetch,
		});
		await transport.init({
			journey: { id: JOURNEY_ID, scope: 'tab', storedChoice: true },
			overrides: {},
			user: null,
		});
		const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));
		expect(url.pathname).toBe('/c15t/init');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			c15tJourney: JOURNEY_ID,
			c15tJourneyScope: 'tab',
			c15tStored: '1',
		});
		// Query parameters only: no header a backend would have to allow.
		const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<
			string,
			string
		>;
		expect(Object.keys(headers).some((name) => /journey/iu.test(name))).toBe(
			false
		);
	});

	test('hosted init without a journey sends the plain URL', async () => {
		const fetchSpy = respond();
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof fetch,
		});
		await transport.init({ overrides: {}, user: null });
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://api.example.com/c15t/init'
		);
	});

	test('a relative init route keeps its own query', async () => {
		const fetchSpy = respond();
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof fetch,
			initURL: '/api/consent/init?site=shop',
		});
		await transport.init({
			journey: { id: JOURNEY_ID, scope: 'page', storedChoice: false },
			overrides: {},
			user: null,
		});
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			`/api/consent/init?site=shop&c15tJourney=${JOURNEY_ID}&c15tJourneyScope=page&c15tStored=0`
		);
	});

	test('hosted save carries the journey on the URL, not in the body', async () => {
		const fetchSpy = respond();
		const transport = createHostedTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof fetch,
		});
		await transport.save({
			...savePayload,
			journey: { id: JOURNEY_ID, scope: 'page' },
		});
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe(
			`https://api.example.com/c15t/subjects?c15tJourney=${JOURNEY_ID}&c15tJourneyScope=page`
		);
		expect(String(init?.body)).not.toContain(JOURNEY_ID);

		await transport.save(savePayload);
		expect(fetchSpy.mock.calls[1]?.[0]).toBe(
			'https://api.example.com/c15t/subjects'
		);
	});

	test('a manifest init resolved in the browser leaves its journey off the save', async () => {
		const fetchSpy = respond();
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof fetch,
			manifest: MANIFEST_FIXTURE,
		});
		const journey = { id: JOURNEY_ID, scope: 'page' as const };
		await transport.init?.({
			journey: { ...journey, storedChoice: false },
			overrides: {},
			user: null,
		});
		// No /init and no report named the id, so the save sends none.
		await transport.save?.({ ...savePayload, journey });
		expect(fetchSpy.mock.calls.at(-1)?.[0]).toBe(
			'https://api.example.com/c15t/subjects'
		);
	});

	test('a manifest init that reports keeps the journey on the save', async () => {
		const fetchSpy = respond();
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof fetch,
			manifest: MANIFEST_FIXTURE,
			report: { adapter: '@c15t/test', source: 'route' },
		});
		const journey = { id: JOURNEY_ID, scope: 'page' as const };
		await transport.init?.({
			journey: { ...journey, storedChoice: false },
			overrides: {},
			user: null,
		});
		await transport.save?.({ ...savePayload, journey });
		const saved = fetchSpy.mock.calls.find(([url]) =>
			String(url).includes('/subjects')
		);
		expect(String(saved?.[0])).toContain(`c15tJourney=${JOURNEY_ID}`);
	});

	test('manifest save carries the journey on the URL', async () => {
		const fetchSpy = respond();
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof fetch,
			manifest: MANIFEST_FIXTURE,
		});
		await transport.save?.({
			...savePayload,
			journey: { id: JOURNEY_ID, scope: 'tab' },
		});
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			`https://api.example.com/c15t/subjects?c15tJourney=${JOURNEY_ID}&c15tJourneyScope=tab`
		);
	});
});
