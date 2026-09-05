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
	choice: {
		categories: {
			marketing: {
				basis: { fingerprint: 'test-choice', kind: 'choice-v1' },
				confirmedAt: 1_700_000_000_000,
				value: false,
			},
		},
		version: 3,
	},
	confirmed: { actionAt: 1_700_000_000_000, categories: { marketing: false } },
	consentAction: 'all',
	consents: {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	},
	givenAt: 1_700_000_000_000,
	model: 'opt-in',
	overrides: {},
	policySnapshotToken: null,
	subject: { subjectId: 'sub_test' },
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

	test('rejects removed endpoint-handler configuration', () => {
		expect(() =>
			custom({
				// @ts-expect-error Old endpoint handlers are no longer supported.
				setConsent: vi.fn(),
			})
		).toThrow('custom() requires a KernelTransport');
	});
});
