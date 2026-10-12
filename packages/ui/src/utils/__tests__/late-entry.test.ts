import { afterEach, describe, expect, test, vi } from 'vitest';

import { isLateEntry, LATE_ENTRY_THRESHOLD_MS } from '../late-entry';

const paintAt = function paintAt(startTime: number | null) {
	const entries =
		startTime === null
			? []
			: [{ name: 'first-contentful-paint', startTime } as PerformanceEntry];
	vi.spyOn(performance, 'getEntriesByType').mockImplementation((type) =>
		type === 'paint' ? entries : []
	);
};

describe('isLateEntry', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('is not late before the first contentful paint', () => {
		paintAt(null);
		expect(isLateEntry(5000)).toBe(false);
	});

	test('is not late within the threshold of the first paint', () => {
		paintAt(400);
		expect(isLateEntry(400 + LATE_ENTRY_THRESHOLD_MS)).toBe(false);
	});

	test('is late once the threshold has passed', () => {
		paintAt(400);
		expect(isLateEntry(401 + LATE_ENTRY_THRESHOLD_MS)).toBe(true);
	});

	test('reads the clock when no time is given', () => {
		paintAt(0);
		vi.spyOn(performance, 'now').mockReturnValue(1200);
		expect(isLateEntry()).toBe(true);
	});

	test('is not late without paint timing', () => {
		vi.stubGlobal('performance', {});
		try {
			expect(isLateEntry(5000)).toBe(false);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
