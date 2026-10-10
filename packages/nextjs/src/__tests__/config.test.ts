import { hosted, manifest, offline } from '@c15t/core/modes';
/**
 * Tests for `defineConsentConfig`: validation, defaults and freezing. The
 * checks run where Next.js first evaluates the config, on the server, so
 * these run in Node.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import { defineConsentConfig } from '../config';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('defineConsentConfig', () => {
	test('returns a frozen config carrying every field', () => {
		const scripts = [
			{ category: 'measurement' as const, id: 'tag', src: '/t.js' },
		];
		const config = defineConsentConfig({
			backendURL: 'https://consent.example.com',
			journey: 'tab',
			mode: manifest({ resolve: 'browser' }),
			routePrefix: '/api/consent/',
			scripts,
		});

		expect(config).toEqual({
			backendURL: 'https://consent.example.com',
			journey: 'tab',
			mode: { resolve: 'browser', type: 'manifest' },
			routePrefix: '/api/consent',
			scripts,
		});
		expect(Object.isFrozen(config)).toBe(true);
	});

	test('reads the backend URL from NEXT_PUBLIC_C15T_BACKEND_URL', () => {
		vi.stubEnv('NEXT_PUBLIC_C15T_BACKEND_URL', 'https://env.example.com');

		expect(defineConsentConfig().backendURL).toBe('https://env.example.com');
	});

	test('needs no backend URL for offline() or a hosted() that has one', () => {
		vi.stubEnv('NEXT_PUBLIC_C15T_BACKEND_URL', '');

		expect(defineConsentConfig({ mode: offline() })).toEqual({
			mode: { type: 'offline' },
		});
		expect(() =>
			defineConsentConfig({
				mode: hosted({ backendURL: 'https://consent.example.com' }),
			})
		).not.toThrow();
		expect(() => defineConsentConfig({ mode: hosted() })).toThrow(
			/NEXT_PUBLIC_C15T_BACKEND_URL/u
		);
		expect(() => defineConsentConfig()).toThrow(
			/NEXT_PUBLIC_C15T_BACKEND_URL/u
		);
	});

	test('proxy needs routePrefix', () => {
		expect(() =>
			defineConsentConfig({
				backendURL: 'https://consent.example.com',
				proxy: true,
			})
		).toThrow(
			'@c15t/nextjs: `proxy` sends saves through the consent route, so it needs `routePrefix`.'
		);
		expect(
			defineConsentConfig({
				backendURL: 'https://consent.example.com',
				proxy: true,
				routePrefix: '/api/c15t/',
			})
		).toMatchObject({
			backendURL: 'https://consent.example.com',
			proxy: true,
			routePrefix: '/api/c15t',
		});
	});

	test('accepts relative paths and absolute http(s) URLs', () => {
		expect(() =>
			defineConsentConfig({
				backendURL: '/api/c15t',
				mode: manifest({
					manifestURL: 'http://localhost:3000/api/consent/manifest',
				}),
			})
		).not.toThrow();
	});

	test.each([
		['empty backendURL', { backendURL: '' }],
		['bare path', { backendURL: 'api/c15t' }],
		['protocol-relative URL', { backendURL: '//consent.example.com' }],
		['non-http scheme', { backendURL: 'ftp://consent.example.com' }],
		['bare routePrefix', { backendURL: '/api/c15t', routePrefix: 'api/c15t' }],
		[
			'invalid manifestURL',
			{ backendURL: '/api/c15t', mode: manifest({ manifestURL: 'manifest' }) },
		],
		[
			'non-string hosted backendURL',
			{ mode: { backendURL: 42, type: 'hosted' } },
		],
		['unknown mode', { backendURL: '/api/c15t', mode: { type: 'custom' } }],
		['unknown journey', { backendURL: '/api/c15t', journey: 'session' }],
	])('rejects %s', (_label, input) => {
		expect(() => defineConsentConfig(input as never)).toThrow(TypeError);
	});
});
