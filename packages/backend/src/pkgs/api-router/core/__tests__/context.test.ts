import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createSDKMiddleware, optionsMiddleware } from '../context';

describe('Context Module', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('optionsMiddleware', () => {
		test('should return an empty context object', async () => {
			const result = await optionsMiddleware({});
			expect(result).toEqual({});
		});
	});

	describe('createSDKMiddleware', () => {
		test('should create a middleware function', () => {
			const middleware = createSDKMiddleware(async () => {
				return { context: { test: true } };
			});

			expect(middleware).toBeTypeOf('function');
		});

		test('should pass context to middleware handler', async () => {
			const mockHandler = vi
				.fn()
				.mockResolvedValue({ context: { test: true } });
			const middleware = createSDKMiddleware(mockHandler);

			const mockContext = {
				headers: new Headers(),
				params: { id: '123' },
				context: { baseURL: 'https://api.example.com' },
			};

			await middleware(mockContext);

			expect(mockHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.any(Headers),
					params: { id: '123' },
					context: expect.objectContaining({
						baseURL: 'https://api.example.com',
					}),
				})
			);
		});

		test('should handle error thrown by middleware handler', async () => {
			const error = new Error('Test error');
			const mockHandler = vi.fn().mockRejectedValue(error);
			const middleware = createSDKMiddleware(mockHandler);

			const mockContext = {
				headers: new Headers(),
				context: {},
			};

			await expect(middleware(mockContext)).rejects.toThrow('Test error');
		});

		test('should support modifying headers in middleware', async () => {
			const middleware = createSDKMiddleware(async () => {
				const headers = new Headers();
				headers.set('X-Custom-Header', 'test-value');

				return {
					context: {
						headers,
					},
				};
			});

			const mockContext = {
				headers: new Headers(),
				context: {},
			};

			const result = await middleware(mockContext);

			expect(result).toEqual({
				context: {
					headers: expect.any(Headers),
				},
			});

			expect(result.context.headers.get('X-Custom-Header')).toBe('test-value');
		});
	});
});
