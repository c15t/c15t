import { exec } from 'node:child_process';
import { createServer } from 'node:http';
import { promisify } from 'node:util';
import { c15tInstance } from '@c15t/backend';
import type { C15TOptions } from '@c15t/backend';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { c15tClient } from './index';

const execAsync = promisify(exec);

// Server configuration for integration tests
const mockOptions: C15TOptions = {
	appName: 'C15T Test Server',
	basePath: '/',
	trustedOrigins: ['localhost', 'test.example.com'],
	cors: true,
	advanced: {
		cors: {
			allowHeaders: ['content-type', 'x-request-id'],
		},
	},
	// logger: {
	//   level: 'debug',
	// },
};

describe('C15T Node SDK', () => {
	const PORT = 8787;
	const mockBaseUrl = `http://localhost:${PORT}`;
	let server: ReturnType<typeof c15tInstance>;
	let httpServer: ReturnType<typeof createServer>;
	let client: ReturnType<typeof c15tClient>;

	beforeAll(async () => {
		// Initialize the server for integration tests
		server = c15tInstance(mockOptions);

		// Create and start HTTP server
		httpServer = createServer(async (req, res) => {
			try {
				// Read request body if present
				let body: string | undefined;
				if (req.method !== 'GET' && req.method !== 'HEAD') {
					const chunks: Uint8Array[] = [];
					for await (const chunk of req) {
						chunks.push(chunk);
					}
					body = Buffer.concat(chunks).toString();
				}

				// Convert Node.js request to web standard Request
				const request = new Request(`http://localhost:${PORT}${req.url}`, {
					method: req.method,
					headers: req.headers as Record<string, string>,
					body: body,
					duplex: 'half',
				});

				// Handle the request with c15tInstance
				const response = await server.handler(request);

				// Set response status and headers
				res.statusCode = response.status;
				for (const [key, value] of response.headers.entries()) {
					res.setHeader(key, value);
				}

				// Ensure content-type is set for JSON responses
				if (!response.headers.get('content-type')) {
					res.setHeader('content-type', 'application/json');
				}

				// Get response body
				const responseBody = await response.text();

				// Send response
				res.end(responseBody);
			} catch (error) {
				console.error('Server error:', error);
				res.statusCode = 500;
				res.setHeader('content-type', 'application/json');
				res.end(
					JSON.stringify({
						error: 'Internal Server Error',
						message: error instanceof Error ? error.message : String(error),
					})
				);
			}
		});

		await new Promise<void>((resolve) => {
			httpServer.listen(PORT, () => {
				console.log(`Test server listening on port ${PORT}`);
				resolve();
			});
		});

		// Initialize the client for testing
		client = c15tClient({
			baseUrl: mockBaseUrl,
			prefix: '/',
		});
	});

	afterAll(async () => {
		// Clean up server
		await new Promise<void>((resolve) => {
			httpServer.close(() => {
				console.log('Test server closed');
				resolve();
			});
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Unit Tests', () => {
		describe('Client Creation', () => {
			it('should create a client with basic configuration', () => {
				const client = c15tClient({ baseUrl: mockBaseUrl });

				expect(client).toBeDefined();
				expect(client.consent).toBeDefined();
				expect(client.meta).toBeDefined();
			});

			it('should include authorization header when token is provided', () => {
				const client = c15tClient({
					baseUrl: mockBaseUrl,
					token: 'test-token',
				});

				expect(client).toBeDefined();
			});

			it('should include custom headers when provided', () => {
				const client = c15tClient({
					baseUrl: mockBaseUrl,
					headers: { 'X-Custom-Header': 'test-value' },
				});

				expect(client).toBeDefined();
			});

			it('should apply prefix to base URL when provided', () => {
				const prefix = '/api/v1';
				const client = c15tClient({
					baseUrl: mockBaseUrl,
					prefix,
				});

				expect(client).toBeDefined();
			});

			it('should handle URL with existing path', () => {
				const baseUrl = 'http://localhost:8787/existing';
				const prefix = '/api/v1';
				const client = c15tClient({
					baseUrl,
					prefix,
				});

				expect(client).toBeDefined();
			});
		});

		describe('Error Handling', () => {
			it('should handle invalid base URL', () => {
				expect(() => {
					c15tClient({ baseUrl: 'invalid-url' });
				}).toThrow();
			});

			it('should handle empty base URL', () => {
				expect(() => {
					c15tClient({ baseUrl: '' });
				}).toThrow();
			});
		});
	});

	describe('Integration Tests', () => {
		it('should connect to status endpoint', async () => {
			const response = await client.meta.status();

			// Test exact structure based on actual response
			expect(response).toEqual({
				status: 'ok',
				version: expect.any(String),
				timestamp: expect.any(String),
				storage: {
					type: 'memory',
					available: true,
				},
				client: {
					ip: expect.any(String),
					userAgent: expect.any(String),
					region: {
						countryCode: null,
						regionCode: null,
					},
				},
			});
		});
	});
});
