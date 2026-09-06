import { describe, expect, test } from 'vitest';

import { isIABConfigured } from '../iab-options';

describe('isIABConfigured', () => {
	test('an absent option is no CMP', () => {
		expect(isIABConfigured(undefined)).toBe(false);
		expect(isIABConfigured(null)).toBe(false);
	});

	test('`false` is no CMP', () => {
		expect(isIABConfigured(false)).toBe(false);
	});

	test('`enabled: false` keeps the configuration but inert', () => {
		expect(isIABConfigured({ enabled: false })).toBe(false);
	});

	test('any other options object is a configured CMP', () => {
		expect(isIABConfigured({})).toBe(true);
		expect(isIABConfigured({ enabled: true })).toBe(true);
	});
});
