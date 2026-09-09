import { writePolicyResolutionWire } from '@c15t/schema/types';
/**
 * Provider transport factories: `hosted()` and `custom()`.
 *
 * `offline()` lives in the framework adapters and is tested there.
 */
import type { InitOutput } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import type { KernelTransport, SavePayload } from '../index';
import { custom, hosted } from '../transports/mode';
import type { ProviderTransportContext } from '../transports/mode';
import { matchedResolution, optInRule } from './fixtures/kernel-fixtures';

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

	test('forwards initURL and assertDecisionInputs to the hosted transport', async () => {
		const init: InitOutput = {
			branding: 'c15t',
			hasConsented: false,
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: 'BE' },
			policy: {
				consentDefaults: {},
				expiryDays: 365,
				id: 'eu-opt-in',
				model: 'opt-in',
				scopeMode: 'strict',
				uiMode: 'banner',
			},
			policyResolution: writePolicyResolutionWire(
				matchedResolution(optInRule({ id: 'eu-opt-in' }))
			),
			resolvedOverrides: { country: 'DE', language: 'de', region: 'BE' },
			translations: { language: 'de', translations: {} as never },
		};
		const fetchSpy = vi.fn((input: string | URL | Request) =>
			Promise.resolve(
				new Response(
					JSON.stringify(
						String(input) === '/api/consent/init' ? init : { ok: true }
					)
				)
			)
		);
		const mode = hosted({
			assertDecisionInputs: true,
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			initURL: '/api/consent/init',
			url: 'https://backend.example',
		});
		const transport = mode(context);

		await transport.init?.({ overrides: {}, user: null });
		await transport.save?.(payload);

		expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([
			'/api/consent/init',
			'https://backend.example/subjects',
		]);
		const body = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body));
		expect(body).toMatchObject({
			country: 'DE',
			fingerprint: init.policyResolution.fingerprints.policy,
			language: 'de',
			policyId: 'eu-opt-in',
			region: 'BE',
		});
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
