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

describe('postSubjectInputSchema domain', () => {
	const parseDomain = (domain: string) =>
		v.safeParse(postSubjectInputSchema, {
			...baseInput,
			domain,
			givenAt: 1_735_689_600_000,
		});

	it.each([
		['a host name', 'example.com'],
		['a host with a port', 'localhost:3000'],
		['an IPv6 literal', '[::1]'],
		['a 253-character name', `${'a'.repeat(249)}.com`],
	])('accepts %s', (_label, domain) => {
		expect(parseDomain(domain).success).toBe(true);
	});

	it.each([
		['an empty string', ''],
		['a 254-character name', `${'a'.repeat(250)}.com`],
		['a newline', 'example.com\nother'],
		['a NUL character', 'example.com\u0000'],
	])('rejects %s', (_label, domain) => {
		expect(parseDomain(domain).success).toBe(false);
	});
});
