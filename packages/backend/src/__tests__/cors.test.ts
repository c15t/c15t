import {} from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { c15tInstance } from '../core';

// Create MSW server instance
const server = setupServer();

// Setup and teardown
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('C15T CORS Configuration', () => {
	const baseUrl = 'https://api.example.com';
	const testEndpoint = '/show-consent-banner';

	// Helper function to create a test request
	const createTestRequest = (origin?: string, method = 'GET') => {
		const headers: Record<string, string> = {
			'content-type': 'application/json',
		};
		if (origin) {
			headers.origin = origin;
		}
		return new Request(`${baseUrl}${testEndpoint}`, {
			method,
			headers,
		});
	};

	// Helper function to create a test instance
	const createTestInstance = (trustedOrigins?: string[]) => {
		return c15tInstance({
			trustedOrigins,
			appName: 'Test App',
		});
	};

	describe('Wildcard Origin Configuration', () => {
		it('should allow any origin when trustedOrigins includes "*"', async () => {
			const c15t = createTestInstance(['*']);
			const request = createTestRequest('http://localhost:3002');

			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				'http://localhost:3002'
			);
		});

		it('should handle requests without origin header', async () => {
			const c15t = createTestInstance(['*']);
			const request = createTestRequest();

			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});
	});

	describe('Specific Origin Configuration', () => {
		it('should allow requests from trusted origins', async () => {
			const c15t = createTestInstance(['http://localhost:3002']);
			const request = createTestRequest('http://localhost:3002');

			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				'http://localhost:3002'
			);
		});

		it('should deny requests from untrusted origins', async () => {
			const c15t = createTestInstance(['http://localhost:3002']);
			const request = createTestRequest('http://malicious-site.com');

			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
		});
	});

	describe('Default Configuration', () => {
		it('should use default CORS settings when no trustedOrigins specified', async () => {
			const c15t = createTestInstance();
			const request = createTestRequest('http://localhost:3002');

			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});
	});

	describe('Preflight Requests', () => {
		it('should handle OPTIONS requests correctly', async () => {
			const c15t = createTestInstance(['http://localhost:3002']);
			const request = createTestRequest('http://localhost:3002', 'OPTIONS');

			const response = await c15t.handler(request);
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				'http://localhost:3002'
			);
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
				'GET'
			);
		});
	});

	describe('Method Support', () => {
		it('should support all required HTTP methods', async () => {
			const c15t = createTestInstance(['http://localhost:3002']);
			const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

			for (const method of methods) {
				const request = createTestRequest('http://localhost:3002', method);
				const response = await c15t.handler(request);

				// For methods other than GET, we expect 404 since we only defined GET endpoints
				const expectedStatus = method === 'GET' ? 200 : 404;
				expect(response.status).toBe(expectedStatus);
			}
		});
	});

	describe('CORS Blocking Scenarios', () => {
		it('should block preflight requests from untrusted origins', async () => {
			const c15t = createTestInstance(['http://localhost:3001']);
			const request = createTestRequest('http://localhost:3002', 'OPTIONS');

			const response = await c15t.handler(request);
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
				'GET, HEAD, PUT, POST, DELETE, PATCH'
			);
		});

		it('should block actual requests from untrusted origins', async () => {
			const c15t = createTestInstance(['http://localhost:3001']);
			const request = createTestRequest('http://localhost:3002', 'POST');

			const response = await c15t.handler(request);
			expect(response.status).toBe(404);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
			expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
				null
			);
		});

		it('should handle preflight requests with missing origin header', async () => {
			const c15t = createTestInstance(['http://localhost:3001']);
			const request = createTestRequest(undefined, 'OPTIONS');

			const response = await c15t.handler(request);
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
				'GET'
			);
		});
	});
});
