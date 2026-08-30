import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { postSubjectInputSchema } from './post';

const baseInput = {
	type: 'cookie_banner' as const,
	subjectId: 'sub_user1',
	domain: 'example.com',
	preferences: { necessary: true },
};

const parseGivenAt = (givenAt: unknown) =>
	v.safeParse(postSubjectInputSchema, { ...baseInput, givenAt });

describe('postSubjectInputSchema givenAt', () => {
	it.each([
		['a normal epoch millisecond timestamp', 1_735_689_600_000],
		['the maximum timestamp Date can represent', 8_640_000_000_000_000],
		['the minimum timestamp Date can represent', -8_640_000_000_000_000],
		['the unix epoch', 0],
		['a fractional timestamp', 1_735_689_600_000.5],
	])('accepts %s', (_label, givenAt) => {
		expect(parseGivenAt(givenAt).success).toBe(true);
	});

	// Each finite out-of-range value produces an Invalid Date. Non-finite
	// numbers are rejected by Valibot's number schema.
	it.each([
		['beyond the Date range', 8_640_000_000_000_001],
		['below the Date range', -8_640_000_000_000_001],
		['absurdly large', 1e18],
		['NaN', Number.NaN],
		['Infinity', Number.POSITIVE_INFINITY],
	])('rejects a %s timestamp', (_label, givenAt) => {
		expect(parseGivenAt(givenAt).success).toBe(false);
	});

	it('rejects a timestamp that Date would otherwise turn invalid', () => {
		expect(new Date(1e18).getTime()).toBeNaN();
		expect(parseGivenAt(1e18).success).toBe(false);
	});
});
