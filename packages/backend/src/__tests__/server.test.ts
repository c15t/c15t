import { describe, expect, it } from 'vitest';
import { type C15TOptions, c15tInstance } from '../core';

const mockOptions: C15TOptions = {
	appName: 'Consent.io Dashboard',
	basePath: '/api/c15t',
	trustedOrigins: ['localhost', 'vercel.app', 'consent.io'],
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
});
