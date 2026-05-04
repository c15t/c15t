import { describe, expect, test } from 'vitest';
import {
	createElementIdResolver,
	generateRandomId,
	normalizeScripts,
} from '../normalize';
import type { Script } from '../types';

const baseScript: Script = {
	id: 's1',
	src: 'https://example.com/s.js',
	category: 'marketing',
};

describe('generateRandomId', () => {
	test('produces an 8-char string', () => {
		expect(generateRandomId()).toHaveLength(8);
	});
});

describe('normalizeScripts', () => {
	test('flags hasIabMeta when vendorId is present', () => {
		const [out] = normalizeScripts([{ ...baseScript, vendorId: 'v1' }]);
		expect(out?.hasIabMeta).toBe(true);
	});

	test('flags hasIabMeta when iabPurposes is non-empty', () => {
		const [out] = normalizeScripts([{ ...baseScript, iabPurposes: [1, 2] }]);
		expect(out?.hasIabMeta).toBe(true);
	});

	test('flags hasIabMeta when iabLegIntPurposes is non-empty', () => {
		const [out] = normalizeScripts([{ ...baseScript, iabLegIntPurposes: [3] }]);
		expect(out?.hasIabMeta).toBe(true);
	});

	test('flags hasIabMeta when iabSpecialFeatures is non-empty', () => {
		const [out] = normalizeScripts([
			{ ...baseScript, iabSpecialFeatures: [1] },
		]);
		expect(out?.hasIabMeta).toBe(true);
	});

	test('hasIabMeta is false when no IAB metadata is present', () => {
		const [out] = normalizeScripts([baseScript]);
		expect(out?.hasIabMeta).toBe(false);
	});

	test('simpleCategory captures string categories', () => {
		const [out] = normalizeScripts([{ ...baseScript, category: 'marketing' }]);
		expect(out?.simpleCategory).toBe('marketing');
	});

	test('simpleCategory is null for non-string categories', () => {
		const [out] = normalizeScripts([
			{
				...baseScript,
				// biome-ignore lint/suspicious/noExplicitAny: HasCondition shape varies
				category: { type: 'AND', conditions: [] } as any,
			},
		]);
		expect(out?.simpleCategory).toBeNull();
	});
});

describe('createElementIdResolver', () => {
	test('uses stable c15t-script-<id> when anonymizeId is false', () => {
		const resolver = createElementIdResolver();
		expect(resolver.resolve({ ...baseScript, anonymizeId: false })).toBe(
			'c15t-script-s1'
		);
	});

	test('returns the same anonymized ID across calls for the same script', () => {
		const resolver = createElementIdResolver();
		const a = resolver.resolve(baseScript);
		const b = resolver.resolve(baseScript);
		expect(a).toBe(b);
	});

	test('keeps anonymized IDs stable across resolver instances and clear()', () => {
		const resolver = createElementIdResolver();
		const a = resolver.resolve(baseScript);
		resolver.clear();
		const b = createElementIdResolver().resolve(baseScript);
		expect(b).toBe(a);
	});
});
