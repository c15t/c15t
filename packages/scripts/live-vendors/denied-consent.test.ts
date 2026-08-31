import { describe, expect, it } from 'vitest';

import { evaluateDeniedConsentProbe } from './denied-consent';
import type { DeniedConsentProbeConfig, LiveStorageSnapshot } from './types';

const config: DeniedConsentProbeConfig = {
	collectUrlSubstrings: ['api-js.mixpanel.com', 'api.mixpanel.com'],
	storagePrefixes: ['mp_'],
};

const storage = function storage(
	overrides?: Partial<LiveStorageSnapshot>
): LiveStorageSnapshot {
	return { cookieNames: [], localStorageKeys: [], ...overrides };
};

describe('evaluateDeniedConsentProbe', () => {
	it('passes when only loader/config requests occurred and storage is clean', () => {
		const result = evaluateDeniedConsentProbe(
			config,
			['https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'],
			storage({
				// Opt-out consent markers are legitimate and excluded by prefix.
				localStorageKeys: ['__mp_opt_in_out_c15f'],
			})
		);

		expect(result.ok).toBe(true);
	});

	it('fails when a collection request was attempted, even if blocked', () => {
		const result = evaluateDeniedConsentProbe(
			config,
			[
				'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
				'https://api-js.mixpanel.com/track/?data=abc',
			],
			storage()
		);

		expect(result.ok).toBe(false);
		expect(result.detail).toContain('api-js.mixpanel.com/track');
	});

	it('fails when vendor cookies or localStorage keys appear', () => {
		const result = evaluateDeniedConsentProbe(
			config,
			[],
			storage({
				cookieNames: ['mp_c15f_mixpanel'],
				localStorageKeys: ['mp_super_properties'],
			})
		);

		expect(result.ok).toBe(false);
		expect(result.detail).toContain('cookie mp_c15f_mixpanel');
		expect(result.detail).toContain('localStorage mp_super_properties');
	});

	it('treats storage prefixes as optional', () => {
		const result = evaluateDeniedConsentProbe(
			{ collectUrlSubstrings: ['collect.example.com'] },
			[],
			storage({ cookieNames: ['anything'] })
		);

		expect(result.ok).toBe(true);
	});
});
