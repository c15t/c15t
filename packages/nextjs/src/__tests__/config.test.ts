/**
 * Tests for `defineConsentConfig`: validation, freezing, and the dev
 * warning for an `initURL` with no `manifestURL`.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import { defineConsentConfig, isConsentConfig } from '../config';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('defineConsentConfig', () => {
	test('returns a frozen config carrying every field', () => {
		const config = defineConsentConfig({
			backendURL: 'https://consent.example.com',
			initURL: '/api/consent/init',
			manifestURL: '/api/consent/manifest',
		});

		expect(config).toMatchObject({
			backendURL: 'https://consent.example.com',
			initURL: '/api/consent/init',
			manifestURL: '/api/consent/manifest',
		});
		expect(Object.isFrozen(config)).toBe(true);
		expect(isConsentConfig(config)).toBe(true);
		expect(isConsentConfig({ ...config })).toBe(true);
		expect(isConsentConfig({ backendURL: '/api/c15t' })).toBe(false);
	});

	test('serializes to plain JSON without the brand', () => {
		const config = defineConsentConfig({ backendURL: '/api/c15t' });

		expect(JSON.parse(JSON.stringify(config))).toEqual({
			backendURL: '/api/c15t',
		});
	});

	test('accepts relative paths and absolute http(s) URLs', () => {
		expect(() =>
			defineConsentConfig({
				backendURL: '/api/c15t',
				manifestURL: 'http://localhost:3000/api/consent/manifest',
			})
		).not.toThrow();
	});

	test.each([
		['missing backendURL', {}],
		['empty backendURL', { backendURL: '' }],
		['bare path', { backendURL: 'api/c15t' }],
		['protocol-relative URL', { backendURL: '//consent.example.com' }],
		['non-http scheme', { backendURL: 'ftp://consent.example.com' }],
		[
			'invalid manifestURL',
			{ backendURL: '/api/c15t', manifestURL: 'manifest' },
		],
		['invalid initURL', { backendURL: '/api/c15t', initURL: 'init' }],
		['non-string initURL', { backendURL: '/api/c15t', initURL: 42 }],
	])('rejects %s', (_label, input) => {
		expect(() => defineConsentConfig(input as never)).toThrow(TypeError);
	});

	test('warns outside production when initURL has no manifestURL', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		defineConsentConfig({
			backendURL: '/api/c15t',
			initURL: '/api/consent/init',
		});

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy.mock.calls[0]?.[0]).toContain('manifestURL');
	});

	test('stays quiet in production', () => {
		vi.stubGlobal('process', { env: { NODE_ENV: 'production' } });
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		defineConsentConfig({
			backendURL: '/api/c15t',
			initURL: '/api/consent/init',
		});

		expect(warnSpy).not.toHaveBeenCalled();
	});

	test('does not warn when manifestURL accompanies initURL', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		defineConsentConfig({
			backendURL: '/api/c15t',
			initURL: '/api/consent/init',
			manifestURL: '/api/consent/manifest',
		});

		expect(warnSpy).not.toHaveBeenCalled();
	});
});
