/**
 * Provider transport factories: `hosted()` and `custom()`.
 *
 * `offline()` lives in the framework adapters and is tested there.
 */
import { describe, expect, test, vi } from 'vitest';

import type { KernelTransport, SavePayload } from '../index';
import { custom, hosted } from '../transports/mode';
import type { ProviderTransportContext } from '../transports/mode';

const context: ProviderTransportContext = {
	prefetch: {},
	translations: { language: 'en', translations: {} as never },
};

const payload: SavePayload = {
	consentAction: 'all',
	consents: { necessary: true },
	givenAt: 1_700_000_000_000,
	model: 'opt-in',
	overrides: {},
	policySnapshotToken: null,
	subjectId: 'sub_test',
	uiSource: 'banner',
	user: null,
};

describe('hosted()', () => {
	test('reports its kind and builds a transport for the backend URL', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
		const mode = hosted({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			url: '/api/c15t/',
		});

		expect(mode.kind).toBe('hosted');
		await mode(context).save?.(payload);
		expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/c15t/subjects');
	});
});

describe('custom()', () => {
	test('passes a kernel transport through unchanged', () => {
		const transport: KernelTransport = { init: vi.fn(), save: vi.fn() };
		const mode = custom(transport);

		expect(mode.kind).toBe('custom');
		expect(mode(context)).toBe(transport);
	});

	test('maps v2 endpoint handlers onto the kernel transport', async () => {
		const setConsent = vi.fn().mockResolvedValue({
			data: { subjectId: 'sub_backend' },
			ok: true,
		});
		const mode = custom({
			init: vi.fn().mockResolvedValue({
				data: { hasConsented: true, subjectId: 'sub_init' },
				ok: true,
			}),
			setConsent,
		});
		const transport = mode(context);

		const initResponse = await transport.init?.({ overrides: {}, user: null });
		expect(initResponse).toMatchObject({
			hasConsented: true,
			subjectId: 'sub_init',
		});

		const saveResult = await transport.save?.(payload);
		expect(saveResult).toEqual({ ok: true, subjectId: 'sub_backend' });
		expect(setConsent).toHaveBeenCalledWith({
			body: expect.objectContaining({
				consentAction: 'all',
				givenAt: 1_700_000_000_000,
				preferences: { necessary: true },
				subjectId: 'sub_test',
				type: 'cookie_banner',
			}),
		});
	});

	test('surfaces an endpoint init failure as a thrown error', async () => {
		const boom = new Error('init unavailable');
		const transport = custom({
			init: vi.fn().mockResolvedValue({ data: null, error: boom, ok: false }),
			setConsent: vi.fn(),
		})(context);

		await expect(transport.init?.({ overrides: {}, user: null })).rejects.toBe(
			boom
		);
	});

	test('maps identifyUser onto the kernel transport', async () => {
		const identifyUser = vi.fn().mockResolvedValue({ ok: true });
		const transport = custom({
			identifyUser,
			setConsent: vi.fn(),
		})(context);
		const user = {
			externalId: 'user_123',
			identityProvider: 'clerk',
		};

		await transport.identify?.(user);

		expect(identifyUser).toHaveBeenCalledWith({ body: user });
	});

	test('treats missing init as an empty response', async () => {
		const transport = custom({ setConsent: vi.fn() })(context);

		await expect(
			transport.init?.({ overrides: {}, user: null })
		).resolves.toEqual({});
	});
});
