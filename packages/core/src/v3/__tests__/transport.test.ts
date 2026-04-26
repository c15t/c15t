/**
 * Transport + commands.init / commands.save tests.
 *
 * These verify the pluggable transport wiring without hitting a real
 * backend. createHostedTransport is also unit-tested against a mocked
 * fetch so we know the request shape and error handling are correct.
 */
import { describe, expect, test, vi } from 'vitest';
import {
	createConsentKernel,
	createHostedTransport,
	type InitResponse,
	type KernelTransport,
	type SaveResult,
} from '../index';

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
			async init() {
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
			async init() {
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
			language: 'de',
			country: 'DE',
			region: 'BE',
		});
	});

	test('server-side consents override config when returned', async () => {
		const transport: KernelTransport = {
			async init() {
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
			async init() {
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
			async init() {
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
		expect(payload?.subjectId).toMatch(/^sub_/);
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

		expect(first).toMatch(/^sub_/);
		expect(second).toBe(first);
		expect(saveSpy.mock.calls[0]?.[0].subjectId).toBe(first);
		expect(saveSpy.mock.calls[1]?.[0].subjectId).toBe(first);
	});

	test('save transport error → result.ok=false + command:error event', async () => {
		const boom = new Error('save failed');
		const transport: KernelTransport = {
			async save() {
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
			async identify() {
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
	test('init POSTs to `${backendURL}/init` with overrides+user', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ policy: { id: 'p', model: 'none' } }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
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

		expect(response?.policy?.id).toBe('p');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		// Trailing slash on backendURL is stripped.
		expect(url).toBe('https://api.example.com/c15t/init');
		expect((init as RequestInit).method).toBe('POST');
		const body = JSON.parse((init as RequestInit).body as string);
		expect(body.overrides).toEqual({ country: 'DE' });
		expect(body.user.externalId).toBe('user-1');
	});

	test('save POSTs to `${backendURL}/subjects` with backend body', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true, subjectId: 'sub-1' }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		const result = await transport.save?.({
			subjectId: 'sub_test',
			consents: {
				necessary: true,
				functionality: true,
				marketing: true,
				measurement: true,
				experience: true,
			},
			overrides: {},
			user: { externalId: 'user-1', identityProvider: 'app' },
			model: 'opt-in',
			uiSource: 'banner',
			consentAction: 'all',
			policySnapshotToken: 'snap-1',
			tcString: 'tc-1',
		});

		expect(result?.subjectId).toBe('sub-1');
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('/api/c15t/subjects');
		const body = JSON.parse((init as RequestInit).body as string);
		expect(body).toMatchObject({
			subjectId: 'sub_test',
			externalSubjectId: 'user-1',
			identityProvider: 'app',
			domain: 'localhost',
			type: 'cookie_banner',
			preferences: {
				necessary: true,
				functionality: true,
				marketing: true,
				measurement: true,
				experience: true,
			},
			jurisdictionModel: 'opt-in',
			uiSource: 'banner',
			consentAction: 'all',
			policySnapshotToken: 'snap-1',
			tcString: 'tc-1',
		});
		expect(typeof body.givenAt).toBe('number');
	});

	test('extra headers are merged into every request', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response('{}', { status: 200 }));
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			headers: { authorization: 'Bearer t' },
		});

		await transport.init?.({ overrides: {}, user: null });
		const [, init] = fetchSpy.mock.calls[0] ?? [];
		expect((init as RequestInit).headers).toMatchObject({
			'content-type': 'application/json',
			authorization: 'Bearer t',
		});
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
		).rejects.toThrow(/\/init responded 500/);
	});
});
