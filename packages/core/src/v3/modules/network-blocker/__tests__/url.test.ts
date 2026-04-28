import { describe, expect, test } from 'vitest';
import type { NetworkBlockerRule } from '../types';
import {
	hostnameMatchesRule,
	methodMatchesRule,
	normalizeMethod,
	parseUrl,
	pathMatchesRule,
} from '../url';

const rule: NetworkBlockerRule = {
	id: 'r',
	domain: 'example.com',
	category: 'marketing',
};

describe('normalizeMethod', () => {
	test('returns GET for missing input', () => {
		expect(normalizeMethod(undefined)).toBe('GET');
		expect(normalizeMethod(null)).toBe('GET');
		expect(normalizeMethod('')).toBe('GET');
	});

	test('upper-cases inputs', () => {
		expect(normalizeMethod('post')).toBe('POST');
		expect(normalizeMethod('Delete')).toBe('DELETE');
	});
});

describe('parseUrl', () => {
	test('passes through URL instances', () => {
		const url = new URL('https://example.com/');
		expect(parseUrl(url)).toBe(url);
	});

	test('handles absolute URL strings', () => {
		const result = parseUrl('https://example.com/foo');
		expect(result?.hostname).toBe('example.com');
		expect(result?.pathname).toBe('/foo');
	});

	test('returns null for inputs the URL constructor cannot resolve', () => {
		// Unbalanced bracket — invalid IPv6 → URL constructor throws.
		expect(parseUrl('http://[::1')).toBeNull();
	});
});

describe('hostnameMatchesRule', () => {
	test('matches the exact domain', () => {
		expect(hostnameMatchesRule('example.com', rule)).toBe(true);
	});

	test('matches a subdomain via suffix', () => {
		expect(hostnameMatchesRule('cdn.example.com', rule)).toBe(true);
	});

	test('does not match a non-suffix substring', () => {
		expect(hostnameMatchesRule('badexample.com', rule)).toBe(false);
	});

	test('is case-insensitive', () => {
		expect(hostnameMatchesRule('CDN.Example.Com', rule)).toBe(true);
	});

	test('returns false for empty hostnames', () => {
		expect(hostnameMatchesRule('', rule)).toBe(false);
	});
});

describe('pathMatchesRule', () => {
	test('matches every path when rule has no pathIncludes', () => {
		expect(pathMatchesRule('/anything', rule)).toBe(true);
	});

	test('matches when pathname contains the substring', () => {
		expect(
			pathMatchesRule('/api/track', { ...rule, pathIncludes: 'track' })
		).toBe(true);
	});

	test('rejects when pathname does not contain the substring', () => {
		expect(
			pathMatchesRule('/api/health', { ...rule, pathIncludes: 'track' })
		).toBe(false);
	});
});

describe('methodMatchesRule', () => {
	test('matches every method when rule has no methods list', () => {
		expect(methodMatchesRule('POST', rule)).toBe(true);
	});

	test('matches when method is in the rule list (case-insensitive)', () => {
		expect(
			methodMatchesRule('post', { ...rule, methods: ['POST', 'PUT'] })
		).toBe(true);
	});

	test('rejects when method is not in the rule list', () => {
		expect(
			methodMatchesRule('GET', { ...rule, methods: ['POST', 'PUT'] })
		).toBe(false);
	});
});
