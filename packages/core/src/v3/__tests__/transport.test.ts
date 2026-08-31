/**
 * Transport + commands.init / commands.save tests.
 *
 * These verify the pluggable transport wiring without hitting a real
 * backend. createHostedTransport is also unit-tested against a mocked
 * fetch so we know the request shape and error handling are correct.
 */
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import {
	createConsentKernel,
	createHostedTransport,
	createManifestTransport,
} from '../index';
import type { InitResponse, KernelTransport, SaveResult } from '../index';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

function createDeferredPromise<Value>(
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
}

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
		const initSpy = vi.fn<
			[Parameters<NonNullable<KernelTransport['init']>>[0]],
			Promise<InitResponse>
		>();
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
		const boom = new Error('backend on fire');
		const transport: KernelTransport = {
			init() {
				throw boom;
			},
		};
		const kernel = createConsentKernel({ transport });

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

	test('provisional policy becomes the compliance fallback when init fails', async () => {
		const transport: KernelTransport = {
			init() {
				throw new Error('backend unreachable');
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

		const result = await kernel.commands.init();

		expect(result.ok).toBe(false);
		// Defaults are the best available policy — show the banner anyway.
		expect(kernel.getSnapshot().policyProvisional).toBe(false);
		expect(kernel.getSnapshot().activeUI).toBe('banner');
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
		const saveSpy = vi.fn<
			[Parameters<NonNullable<KernelTransport['save']>>[0]],
			Promise<SaveResult>
		>();
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
		const saveSpy = vi.fn<
			[Parameters<NonNullable<KernelTransport['save']>>[0]],
			Promise<SaveResult>
		>();
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
		const saveSpy = vi.fn<
			[Parameters<NonNullable<KernelTransport['save']>>[0]],
			Promise<SaveResult>
		>();
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

describe('kernel transport: identify forwards to transport', () => {
	test('identify calls transport.identify after updating snapshot', async () => {
		const identifySpy = vi.fn<[unknown], Promise<void>>();
		identifySpy.mockResolvedValue();
		const transport: KernelTransport = { identify: identifySpy };

		const kernel = createConsentKernel({ transport });
		await kernel.commands.identify({ externalId: 'user-42' });

		expect(kernel.getSnapshot().user?.externalId).toBe('user-42');
		expect(identifySpy).toHaveBeenCalledTimes(1);
	});

	test('identify transport error emits command:error but snapshot still updated', async () => {
		const boom = new Error('identify failed');
		const transport: KernelTransport = {
			identify() {
				throw boom;
			},
		};
		const kernel = createConsentKernel({ transport });
		const errors: unknown[] = [];
		kernel.events.on('command:error', (e) => errors.push(e.error));

		await kernel.commands.identify({ externalId: 'user-42' });

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
		expect(typeof body.givenAt).toBe('number');
	});

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
