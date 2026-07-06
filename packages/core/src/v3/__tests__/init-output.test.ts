/**
 * Shared InitOutput/InitResponse mapping — the single fold every framework
 * server helper and transport uses (shared-logic audit #4).
 */
import { describe, expect, test } from 'vitest';
import { mapInitOutputToInitResponse } from '../transports/init-output';

const BASE_PAYLOAD = {
	location: { countryCode: 'DE', regionCode: null },
	translations: {
		language: 'en',
		translations: {},
	},
	// biome-ignore lint/suspicious/noExplicitAny: minimal rich-init fixture
} as any;

describe('mapInitOutputToInitResponse: consent inference', () => {
	test('consent-bearing payload implies hasConsented', () => {
		const mapped = mapInitOutputToInitResponse(
			{ ...BASE_PAYLOAD, consents: { marketing: true } },
			{}
		);
		expect(mapped.consents).toEqual({ marketing: true });
		// Without this, opt-in fresh-visitor defaults would reset the values
		// and re-show the banner — and the client fold would disagree with
		// the server prefetch merge.
		expect(mapped.hasConsented).toBe(true);
	});

	test('explicit hasConsented: false wins over the inference', () => {
		const mapped = mapInitOutputToInitResponse(
			{ ...BASE_PAYLOAD, consents: { marketing: true }, hasConsented: false },
			{}
		);
		expect(mapped.hasConsented).toBe(false);
	});

	test('no consents → hasConsented passes through untouched', () => {
		expect(
			mapInitOutputToInitResponse(BASE_PAYLOAD, {}).hasConsented
		).toBeUndefined();
		expect(
			mapInitOutputToInitResponse({ ...BASE_PAYLOAD, hasConsented: true }, {})
				.hasConsented
		).toBe(true);
	});
});
