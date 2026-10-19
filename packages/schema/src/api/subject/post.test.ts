import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { postSubjectInputSchema } from './post';

const baseInput = {
	domain: 'example.com',
	preferences: { necessary: true },
	subjectId: 'sub_user1',
	type: 'cookie_banner' as const,
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

describe('postSubjectInputSchema addtlConsent', () => {
	const parseAddtlConsent = (addtlConsent: string) =>
		v.safeParse(postSubjectInputSchema, {
			...baseInput,
			addtlConsent,
			givenAt: 1_735_689_600_000,
			tcString: 'CQ',
		});

	it.each([
		['consented and disclosed providers', '2~89.486~dv.2572'],
		['no consented provider', '2~~dv.2572'],
		['nothing disclosed beyond the consented', '2~89~dv.'],
		['a bare dv', '2~~dv'],
	])('accepts %s', (_label, addtlConsent) => {
		expect(parseAddtlConsent(addtlConsent).success).toBe(true);
	});

	it.each([
		['a version 1 string', '1~89.486'],
		['a missing dv part', '2~89.486'],
		['a non-numeric provider', '2~89.abc~dv.'],
		['an empty string', ''],
	])('rejects %s', (_label, addtlConsent) => {
		expect(parseAddtlConsent(addtlConsent).success).toBe(false);
	});
});

describe('postSubjectInputSchema scripts', () => {
	const parseScripts = (scripts: unknown) =>
		v.safeParse(postSubjectInputSchema, {
			...baseInput,
			givenAt: 1_735_689_600_000,
			scripts,
		});

	it('accepts gating fields and drops keys it does not know', () => {
		const parsed = parseScripts([
			{
				category: { and: ['marketing', { not: 'measurement' }] },
				iabPurposes: [1, 3],
				id: 'meta-pixel',
				src: 'https://connect.facebook.net/en_US/fbevents.js',
				vendor: 'meta-pixel',
				vendorId: 755,
			},
			{ alwaysLoad: true, category: 'necessary', id: 'errors' },
		]);
		expect(parsed.success).toBe(true);
		expect(parsed.output).toHaveProperty('scripts', [
			{
				category: { and: ['marketing', { not: 'measurement' }] },
				iabPurposes: [1, 3],
				id: 'meta-pixel',
				vendor: 'meta-pixel',
				vendorId: 755,
			},
			{ alwaysLoad: true, category: 'necessary', id: 'errors' },
		]);
	});

	it.each([
		['an unknown category', [{ category: 'advertising', id: 'ads' }]],
		['an empty id', [{ category: 'marketing', id: '' }]],
		['a false flag', [{ alwaysLoad: false, category: 'marketing', id: 'a' }]],
		[
			'an IAB purpose of 0',
			[{ category: 'marketing', iabPurposes: [0], id: 'a' }],
		],
		[
			'more than 256 entries',
			Array.from({ length: 257 }, (_, index) => ({
				category: 'marketing',
				id: `s${index}`,
			})),
		],
	])('rejects %s', (_label, scripts) => {
		expect(parseScripts(scripts).success).toBe(false);
	});

	const nested = (depth: number): unknown => {
		let condition: unknown = 'marketing';
		for (let level = 0; level < depth; level += 1) {
			condition = { not: condition };
		}
		return condition;
	};

	it('accepts a condition as deep as core sends', () => {
		expect(parseScripts([{ category: nested(16), id: 'a' }]).success).toBe(
			true
		);
	});

	it('rejects a deeper condition without exhausting the stack', () => {
		expect(parseScripts([{ category: nested(17), id: 'a' }]).success).toBe(
			false
		);
		expect(parseScripts([{ category: nested(100_000), id: 'a' }]).success).toBe(
			false
		);
	});
});
