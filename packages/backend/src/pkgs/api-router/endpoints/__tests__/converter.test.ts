import { APIError } from 'better-call';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runAfterHooks, runBeforeHooks } from '../../hooks/processor';
import { toEndpoints } from '../converter';

// Mock dependencies
vi.mock('../../hooks/processor', () => ({
	runBeforeHooks: vi.fn(),
	runAfterHooks: vi.fn(),
}));

vi.mock('better-call', () => ({
	APIError: class MockAPIError extends Error {
		status: string;
		constructor(options: { status: string; message: string } | string) {
			if (typeof options === 'object') {
				super(options.message);
				this.status = options.status;
			} else {
				super('Unknown error');
				this.status = 'UNKNOWN';
			}
		}
	},
	toResponse: vi.fn().mockImplementation((data, options) => {
		return { data, ...options };
	}),
}));

vi.mock('defu', () => ({
	default: vi.fn().mockImplementation((source, defaults) => {
		return { ...defaults, ...source };
	}),
}));

describe('Endpoints Converter Module', () => {
	// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
	let mockContext: any;
	// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
	let mockEndpoints: any;
	// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
	let mockHeaders: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockHeaders = new Headers();
		mockHeaders.set('X-Modified', 'true');

		// Create a minimal context object
		mockContext = {
			baseURL: 'https://api.doubletie.com',
			hooks: [{ match: () => true, before: vi.fn(), after: vi.fn() }],
		};

		// Create endpoints with necessary properties
		const mockHandler = vi.fn().mockResolvedValue({
			headers: new Headers(),
			response: { data: 'test' },
		});

		mockEndpoints = {
			testEndpoint: mockHandler,
		};

		// Add path and options directly to the function
		mockEndpoints.testEndpoint.path = '/test';
		mockEndpoints.testEndpoint.options = {
			method: 'GET',
			use: [],
		};

		// Mock hook processing with basic responses
		// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
		(runBeforeHooks as any).mockResolvedValue({ context: {} });
		// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
		(runAfterHooks as any).mockResolvedValue({ response: null, headers: null });
	});

	describe('toEndpoints', () => {
		test('should create API functions from endpoint definitions', () => {
			// Use type assertion to bypass type checking
			// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
			const api = toEndpoints(mockEndpoints as any, mockContext as any);

			expect(api).toHaveProperty('testEndpoint');
			expect(typeof api.testEndpoint).toBe('function');
		});

		test('should call runBeforeHooks during execution', async () => {
			// Use type assertion to bypass type checking
			// biome-ignore lint/suspicious/noExplicitAny: its okay
			const api = toEndpoints(mockEndpoints as any, mockContext as any);

			try {
				await api.testEndpoint({
					headers: new Headers(),
					params: { id: '123' },
				});

				// Verify hooks were called
				expect(runBeforeHooks).toHaveBeenCalled();
				expect(runAfterHooks).toHaveBeenCalled();
			} catch (error) {
				expect(error).toBeUndefined();
			}
		});

		test('should handle Promise context', async () => {
			const contextPromise = Promise.resolve(mockContext);

			// Use type assertion to bypass type checking
			// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
			const api = toEndpoints(mockEndpoints as any, contextPromise as any);

			try {
				await api.testEndpoint({});
				expect(mockEndpoints.testEndpoint).toHaveBeenCalled();
			} catch (error) {
				expect(error).toBeUndefined();
			}
		});

		test('should short-circuit when before hook returns non-context result', async () => {
			const shortCircuitResponse = { data: 'short-circuit' };
			// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
			(runBeforeHooks as any).mockResolvedValue(shortCircuitResponse);

			// Use type assertion to bypass type checking
			// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
			const api = toEndpoints(mockEndpoints as any, mockContext as any);

			const result = await api.testEndpoint({});

			expect(result).toBe(shortCircuitResponse);
			expect(mockEndpoints.testEndpoint).not.toHaveBeenCalled();
			expect(runAfterHooks).not.toHaveBeenCalled();
		});

		test('should catch and handle APIErrors from endpoints', async () => {
			//@ts-expect-error
			const error = new (vi.mocked(APIError))({
				status: 'NOT_FOUND',
				message: 'Resource not found',
			});

			mockEndpoints.testEndpoint.mockRejectedValue(error);

			// Use type assertion to bypass type checking
			// biome-ignore lint/suspicious/noExplicitAny: its okay its a test
			const api = toEndpoints(mockEndpoints as any, mockContext as any);

			try {
				await api.testEndpoint({});
			} catch {
				// Expected - the error should be caught and passed to runAfterHooks
			}

			expect(runAfterHooks).toHaveBeenCalled();
		});
	});
});
