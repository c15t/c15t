import { beforeEach, describe, expect, test, vi } from 'vitest';
import { optionsMiddleware } from '../context';
import { DoubleTieEndpoint, createSDKEndpoint } from '../endpoint';

/**
 * Mock context and response types for testing
 */
interface TestRequest {
	id?: string;
	sort?: string;
}

interface TestResponse {
	data: string;
}

describe('Endpoint Module', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createSDKEndpoint', () => {
		test('should create an endpoint function', () => {
			// Creating a simple endpoint with path and options
			const handler = async (): Promise<TestResponse> => ({ data: 'test' });

			const endpoint = createSDKEndpoint(
				'/api/test',
				{ method: 'GET', use: [] },
				handler
			) as DoubleTieEndpoint<TestRequest, TestResponse>;

			expect(typeof endpoint).toBe('function');
			expect(endpoint.path).toBe('/api/test');
			expect(endpoint.options).toHaveProperty('method', 'GET');
			expect(endpoint.options).toHaveProperty('use');
		});

		test('should pass context to handler function', async () => {
			// Create a mock handler using vi.fn() which doesn't require mocking better-call
			const mockHandler = vi.fn().mockResolvedValue({ data: 'test-response' });

			const endpoint = createSDKEndpoint(
				'/api/test',
				{ method: 'GET', use: [] },
				mockHandler
			) as DoubleTieEndpoint<TestRequest, TestResponse>;

			// Create a properly typed mock context
			const mockContext = {
				headers: new Headers(),
				params: { id: '123' } as TestRequest,
				query: { sort: 'asc' },
				context: {},
			};

			await endpoint(mockContext);

			// Check that handler was called
			expect(mockHandler).toHaveBeenCalled();
		});

		test('should handle errors thrown by the handler', async () => {
			const error = new Error('Test error');
			const mockHandler = vi.fn().mockRejectedValue(error);

			const endpoint = createSDKEndpoint(
				'/api/test',
				{ method: 'GET', use: [] },
				mockHandler
			) as DoubleTieEndpoint<TestRequest, TestResponse>;

			const mockContext = {
				headers: new Headers(),
				context: {},
			};

			await expect(endpoint(mockContext)).rejects.toThrow('Test error');
		});
	});
});
