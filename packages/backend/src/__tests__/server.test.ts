import { describe, expect, it } from 'vitest';
import { type C15TOptions, c15tInstance } from '../core';

const mockOptions: C15TOptions = {
	appName: 'Consent.io Dashboard',
	basePath: '/api/c15t',
	trustedOrigins: [
		'localhost',
		'vercel.app',
		'consent.io',
		'https://test.consent.io',
	],
	cors: true,
	advanced: {
		cors: {
			allowHeaders: ['content-type', 'x-request-id'],
		},
	},
	logger: {
		level: 'debug',
	},
};

const createTestRequest = (
	path = '/api/c15t/status',
	method = 'GET',
	headers?: Record<string, string>
) => {
	return new Request(`http://localhost${path}`, {
		method,
		headers: {
			'content-type': 'application/json',
			...(headers || {}),
		},
	});
};

describe('C15T /status endpoint', () => {
	it('GET /api/c15t/status returns 200 and status payload', async () => {
		const c15t = c15tInstance(mockOptions);
		const request = createTestRequest();
		const response = await c15t.handler(request);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveProperty('status');
	});

	it('responds correctly to requests from allowed origins', async () => {
		const c15t = c15tInstance(mockOptions);
		const request = createTestRequest(undefined, undefined, {
			origin: 'https://test.consent.io',
		});
		const response = await c15t.handler(request);
		expect(response.status).toBe(200);
		expect(response.headers.get('access-control-allow-origin')).toBe(
			'https://test.consent.io'
		);
	});

	it('rejects requests from disallowed origins', async () => {
		const c15t = c15tInstance(mockOptions);
		const request = createTestRequest(undefined, undefined, {
			origin: 'https://malicious-site.com',
		});
		const response = await c15t.handler(request);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
	});

	it('handles preflight requests correctly', async () => {
		const c15t = c15tInstance(mockOptions);
		const request = createTestRequest(undefined, 'OPTIONS', {
			origin: 'https://test.consent.io',
			'access-control-request-method': 'GET',
		});
		const response = await c15t.handler(request);
		expect(response.status).toBe(204);
		expect(response.headers.get('access-control-allow-origin')).toBe(
			'https://test.consent.io'
		);
		expect(response.headers.get('access-control-allow-headers')).toContain(
			'Content-Type, Authorization, x-request-id'
		);
	});
});

describe('C15T /docs endpoint', () => {
	it('GET /api/c15t/docs returns 200 and HTML', async () => {
		const c15t = c15tInstance(mockOptions);
		const request = createTestRequest('/api/c15t/docs');
		const response = await c15t.handler(request);
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toContain('<!doctype html>');
		expect(response.headers.get('content-type')).toContain('text/html');
	});
});
