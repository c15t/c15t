import {} from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { c15tInstance } from '../../core';

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

		it('should handle undefined trustedOrigins gracefully', async () => {
			const c15t = createTestInstance(undefined);
			const request = createTestRequest('http://localhost:3002');

			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
				null
			);
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

		it('should handle preflight requests with undefined trustedOrigins', async () => {
			const c15t = createTestInstance(undefined);
			const request = createTestRequest('http://localhost:3002', 'OPTIONS');

			const response = await c15t.handler(request);
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
				'GET, HEAD, PUT, POST, DELETE, PATCH'
			);
			expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
				'Content-Type, Authorization, x-request-id'
			);
			expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
			expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
				null
			);
		});

		it('should handle preflight requests without origin header when trustedOrigins is undefined', async () => {
			const c15t = createTestInstance(undefined);
			const request = createTestRequest(undefined, 'OPTIONS');

			const response = await c15t.handler(request);
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
				'GET, HEAD, PUT, POST, DELETE, PATCH'
			);
			expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
				'Content-Type, Authorization, x-request-id'
			);
			expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
			expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
				null
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

	describe('CORS Header Requirements', () => {
		it('should include all required CORS headers for preflight requests from trusted origins', async () => {
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
			expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
				'Content-Type'
			);
			expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
				'Authorization'
			);
			expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
		});

		it('should NOT include CORS headers for preflight requests from untrusted origins', async () => {
			const c15t = createTestInstance(['http://localhost:3001']);
			const request = createTestRequest('http://localhost:3002', 'OPTIONS');
			const response = await c15t.handler(request);
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
				'GET, HEAD, PUT, POST, DELETE, PATCH'
			);
			expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
				'Content-Type, Authorization, x-request-id'
			);
			expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
		});

		it('should include all required CORS headers for actual requests from trusted origins', async () => {
			const c15t = createTestInstance(['http://localhost:3002']);
			const request = createTestRequest('http://localhost:3002', 'GET');
			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				'http://localhost:3002'
			);
			expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
				'true'
			);
		});

		it('should NOT include Access-Control-Allow-Origin for actual requests from untrusted origins', async () => {
			const c15t = createTestInstance(['http://localhost:3001']);
			const request = createTestRequest('http://localhost:3002', 'GET');
			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Vary')).toBe('origin');
			expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
				'true'
			);
		});
	});

	describe('C15T CORS www/non-www Origin Handling', () => {
		const baseUrl = 'https://api.example.com';
		const testEndpoint = '/show-consent-banner';
		const wwwOrigin = 'http://www.c15t.com';
		const nonWwwOrigin = 'http://c15t.com';

		const createTestRequest = (origin?: string, method = 'GET') => {
			const headers: Record<string, string> = {
				'content-type': 'application/json',
			};
			if (origin) {
				headers.origin = origin;
			}
			return new Request(`${baseUrl}${testEndpoint}`, { method, headers });
		};

		it('should allow www origin if non-www is trusted', async () => {
			const c15t = c15tInstance({
				trustedOrigins: [nonWwwOrigin],
				appName: 'Test App',
			});
			const request = createTestRequest(wwwOrigin);
			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				wwwOrigin
			);
		});

		it('should allow non-www origin if www is trusted', async () => {
			const c15t = c15tInstance({
				trustedOrigins: [wwwOrigin],
				appName: 'Test App',
			});
			const request = createTestRequest(nonWwwOrigin);
			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				nonWwwOrigin
			);
		});

		it('should allow both www and non-www origins if both are trusted', async () => {
			const c15t = c15tInstance({
				trustedOrigins: [wwwOrigin, nonWwwOrigin],
				appName: 'Test App',
			});
			const requestWww = createTestRequest(wwwOrigin);
			const requestNonWww = createTestRequest(nonWwwOrigin);
			const responseWww = await c15t.handler(requestWww);
			const responseNonWww = await c15t.handler(requestNonWww);
			expect(responseWww.status).toBe(200);
			expect(responseWww.headers.get('Access-Control-Allow-Origin')).toBe(
				wwwOrigin
			);
			expect(responseNonWww.status).toBe(200);
			expect(responseNonWww.headers.get('Access-Control-Allow-Origin')).toBe(
				nonWwwOrigin
			);
		});

		it('should deny unrelated origins', async () => {
			const c15t = c15tInstance({
				trustedOrigins: [nonWwwOrigin],
				appName: 'Test App',
			});
			const unrelatedOrigin = 'http://malicious.com';
			const request = createTestRequest(unrelatedOrigin);
			const response = await c15t.handler(request);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
		});
	});

	describe('CORS trustedOrigins normalization and matching', () => {
		const baseUrl = 'https://api.example.com';
		const testEndpoint = '/show-consent-banner';

		const createTestRequest = (origin?: string, method = 'GET') => {
			const headers: Record<string, string> = {
				'content-type': 'application/json',
			};
			if (origin) {
				headers.origin = origin;
			}
			return new Request(`${baseUrl}${testEndpoint}`, { method, headers });
		};

		it('should match http and https with and without www', async () => {
			const c15t = createTestInstance(['localhost:3002', 'example.com']);
			// Should match both http and https, with and without www
			const origins = [
				'http://localhost:3002',
				'https://localhost:3002',
				'http://www.example.com',
				'https://example.com',
			];
			for (const origin of origins) {
				const request = createTestRequest(origin, 'OPTIONS');
				const response = await c15t.handler(request);
				expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
					origin
				);
			}
		});

		it('should not match unrelated origins', async () => {
			const c15t = createTestInstance(['localhost:3002']);
			const request = createTestRequest('http://malicious.com', 'OPTIONS');
			const response = await c15t.handler(request);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
		});

		it('should match wildcard *', async () => {
			const c15t = createTestInstance(['*']);
			const request = createTestRequest('http://any-origin.com', 'OPTIONS');
			const response = await c15t.handler(request);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				'http://any-origin.com'
			);
		});

		it('should match with port', async () => {
			const c15t = createTestInstance(['localhost:3002']);
			const request = createTestRequest('http://localhost:3002', 'OPTIONS');
			const response = await c15t.handler(request);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
				'http://localhost:3002'
			);
		});

		it('should not match if port is different', async () => {
			const c15t = createTestInstance(['localhost:3002']);
			const request = createTestRequest('http://localhost:4000', 'OPTIONS');
			const response = await c15t.handler(request);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
		});
	});
});
