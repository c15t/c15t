import { type Endpoint, createRouter } from 'better-call';
import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '~/pkgs/logger';
import type { C15TContext, C15TOptions } from '~/pkgs/types';
import { toEndpoints } from '../../endpoints/converter';
import { getIp } from '../../utils/ip';
import { createApiRouter, getEndpoints } from '../router';

// Mock dependencies
vi.mock('better-call', () => ({
	createRouter: vi.fn().mockReturnValue({
		handler: vi.fn(),
		use: vi.fn(),
	}),
	APIError: class APIError extends Error {
		status: string;
		constructor(status: string, message: string) {
			super(message);
			this.status = status;
		}
	},
}));

vi.mock('../../utils/ip', () => ({
	getIp: vi.fn().mockReturnValue('192.168.1.1'),
}));

vi.mock('~/pkgs/logger', () => ({
	logger: {
		warn: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('../../endpoints/converter', () => ({
	toEndpoints: vi.fn().mockImplementation((endpoints) => endpoints),
}));

describe('Router Module', () => {
	let mockContext: C15TContext;
	let mockOptions: C15TOptions;
	let mockEndpoints: Record<string, Endpoint>;
	let mockHealthEndpoint: Endpoint;
	let mockOnRequest: unknown;

	beforeEach(() => {
		vi.clearAllMocks();

		mockOnRequest = vi.fn().mockResolvedValue({
			response: { modified: true },
		});
		// Create a basic mock context with required fields
		mockContext = {
			appName: 'test-app',
			trustedOrigins: ['https://example.com'],
			secret: 'test-secret',
			logger,
			//@ts-expect-error
			adapter: {}, // Add missing required field
			//@ts-expect-error
			registry: {}, // Add missing required field
			//@ts-expect-error
			tables: {}, // Add missing required field
			generateId: () => 'mock-id',
			baseURL: 'https://api.doubletie.com',
			hooks: [],
			session: null,
			options: {
				plugins: [],
			},
		};

		// Create mock options
		mockOptions = {
			plugins: [
				{
					id: 'test-plugin',
					name: 'Test Plugin',
					type: 'api',
					endpoints: {
						//@ts-expect-error
						pluginEndpoint: { path: '/plugin' },
					},
					middlewares: [
						{
							path: '/plugin-path',
							//@ts-expect-error
							middleware: {
								options: { method: 'GET' },
							},
						},
					],
					// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
					onRequest: mockOnRequest as any,
					onResponse: vi.fn(),
				},
			],
			onAPIError: {
				throw: false,
				onError: vi.fn(),
			},
		};

		mockEndpoints = {
			//@ts-expect-error
			testEndpoint: { path: '/test' },
		};

		//@ts-expect-error
		mockHealthEndpoint = { path: '/health' };
	});

	describe('getEndpoints', () => {
		test('should merge base endpoints with plugin endpoints', () => {
			// Use type assertion to bypass type checking
			const result = getEndpoints(
				mockContext,
				mockOptions,
				mockEndpoints,
				mockHealthEndpoint
			);

			expect(toEndpoints).toHaveBeenCalled();
			expect(result).toHaveProperty('api');
			expect(result).toHaveProperty('middlewares');
		});

		test('should work with a context promise', async () => {
			const contextPromise = Promise.resolve(mockContext);

			// Use type assertion to bypass type checking
			const result = getEndpoints(
				contextPromise,
				mockOptions,
				mockEndpoints,
				mockHealthEndpoint
			);

			expect(toEndpoints).toHaveBeenCalled();
			expect(result).toHaveProperty('api');
			expect(result).toHaveProperty('middlewares');
		});
	});

	describe('createApiRouter', () => {
		test('should create a router with the correct configuration', () => {
			const coreMiddlewares = [{ path: '/core', middleware: {} }];

			// Use type assertion to bypass type checking
			createApiRouter(
				mockContext,
				mockOptions,
				mockEndpoints,
				mockHealthEndpoint,
				coreMiddlewares
			);

			expect(createRouter).toHaveBeenCalled();
		});

		test('should handle onRequest and add IP to context', () => {
			// Use type assertion to bypass type checking
			createApiRouter(
				mockContext,
				mockOptions,
				mockEndpoints,
				mockHealthEndpoint,
				[]
			);

			const routerConfig = (createRouter as Mock).mock.calls[0]?.[1];
			const mockRequest = new Request('https://api.example.com');

			// Call the onRequest handler directly
			routerConfig.onRequest(mockRequest);

			// Check that getIp was called
			expect(getIp).toHaveBeenCalled();
		});

		test('should handle errors in request processing', async () => {
			// Use type assertion to bypass type checking
			createApiRouter(
				mockContext,
				mockOptions,
				mockEndpoints,
				mockHealthEndpoint,
				[]
			);

			const routerConfig = (createRouter as Mock).mock.calls[0]?.[1];
			const error = new Error('Processing error');

			// Call the onError handler directly
			routerConfig.onError(error);

			expect(logger.error).toHaveBeenCalledWith('API error', { error });
		});
	});
});
