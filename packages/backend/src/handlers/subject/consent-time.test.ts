import { describe, expect, it } from 'vitest';
import { clampConsentGivenAt } from './consent-time';

const NOW = 1_700_000_000_000;

describe('clampConsentGivenAt', () => {
	it('clamps timestamps beyond the drift window to server time', () => {
		expect(clampConsentGivenAt(new Date(NOW + 300_001), NOW)).toEqual(
			new Date(NOW)
		);
	});

	it('preserves timestamps at the edge of the drift window', () => {
		const atLimit = new Date(NOW + 300_000);
		expect(clampConsentGivenAt(atLimit, NOW)).toBe(atLimit);
	});

	it('preserves past timestamps for offline replay', () => {
		const past = new Date(NOW - 30 * 86_400_000);
		expect(clampConsentGivenAt(past, NOW)).toBe(past);
	});
});
