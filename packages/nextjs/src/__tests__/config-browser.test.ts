/**
 * In the browser `defineConsentConfig` only normalizes: Next.js has already
 * run its checks on the server and at build time, and browser bundles drop
 * them. The Node suite in `config.test.ts` covers the checks.
 */
import { expect, test } from 'vitest';

import { defineConsentConfig } from '../config';

test('normalizes without checking', () => {
	const config = defineConsentConfig({
		backendURL: 'https://consent.example.com',
		journey: 'session' as never,
		routePrefix: '/api/c15t/',
	});

	expect(config).toEqual({
		backendURL: 'https://consent.example.com',
		journey: 'session',
		routePrefix: '/api/c15t',
	});
	expect(Object.isFrozen(config)).toBe(true);
});
