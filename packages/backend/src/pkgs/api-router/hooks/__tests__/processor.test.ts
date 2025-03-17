import defu from 'defu';
import { Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import type { BaseC15TContext, HookEndpointContext } from '~/pkgs/types';
import { runAfterHooks, runBeforeHooks } from '../processor';

// Mock defu
vi.mock('defu', () => ({
	default: vi.fn().mockImplementation((source, defaults) => {
		return { ...defaults, ...source };
	}),
}));

// Create a minimal mock of HookEndpointContext for testing
type MockHookContext = Partial<HookEndpointContext> & {
	path: string;
	method?: string;
	headers?: Headers;
	context?: Record<string, unknown>;
};

// Type for hook definition
interface Hook {
	matcher: (context: HookEndpointContext) => boolean;
	handler: Mock;
}

describe('Hook Processor Module', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('runBeforeHooks', () => {
		test('should run matching hooks and merge context', async () => {
			const mockContext: MockHookContext = {
				path: '/test',
				method: 'GET',
				headers: new Headers(),
				// Add required properties to satisfy HookEndpointContext
				body: {},
				query: {},
				params: {},
				request: {} as Request,
				context: {} as any,
			};

			const hooks: Hook[] = [
				{
					matcher: (ctx: HookEndpointContext) => ctx.path === '/test',
					handler: vi.fn().mockResolvedValue({
						context: { testKey1: 'value1' },
					}),
				},
				{
					matcher: (ctx: HookEndpointContext) => ctx.method === 'GET',
					handler: vi.fn().mockResolvedValue({
						context: { testKey2: 'value2' },
					}),
				},
				{
					matcher: (ctx: HookEndpointContext) => ctx.path === '/other',
					handler: vi.fn().mockResolvedValue({
						context: { shouldNotInclude: true },
					}),
				},
			];

			const result = await runBeforeHooks(
				mockContext as HookEndpointContext,
				hooks
			);

			// First two hooks should run, third should not
			expect(hooks[0]?.handler).toHaveBeenCalledWith(
				expect.objectContaining({
					path: '/test',
					method: 'GET',
					returnHeaders: false,
				})
			);
			expect(hooks[1]?.handler).toHaveBeenCalledWith(
				expect.objectContaining({
					path: '/test',
					method: 'GET',
					returnHeaders: false,
				})
			);
			expect(hooks[2]?.handler).not.toHaveBeenCalled();

			// Context should be merged with both hooks' results
			expect(result).toEqual({
				context: expect.objectContaining({
					testKey1: 'value1',
					testKey2: 'value2',
				}),
			});

			// Type assertion to tell TypeScript that context exists on result
			const contextResult = result as { context: Record<string, unknown> };
			expect(contextResult.context).not.toHaveProperty('shouldNotInclude');
		});

		test('should handle headers correctly', async () => {
			const mockContext: MockHookContext = {
				path: '/test',
				headers: new Headers(),
				// Add required properties to satisfy HookEndpointContext
				method: 'GET',
				body: {},
				query: {},
				params: {},
				request: {} as Request,
				context: {} as any,
			};

			const headers1 = new Headers();
			headers1.set('X-Header-1', 'value1');

			const headers2 = new Headers();
			headers2.set('X-Header-2', 'value2');

			const hooks: Hook[] = [
				{
					matcher: (ctx: HookEndpointContext) => true,
					handler: vi.fn().mockResolvedValue({
						context: { headers: headers1 },
					}),
				},
				{
					matcher: (ctx: HookEndpointContext) => true,
					handler: vi.fn().mockResolvedValue({
						context: { headers: headers2 },
					}),
				},
			];

			const result = await runBeforeHooks(
				mockContext as HookEndpointContext,
				hooks
			);

			// Type assertion to tell TypeScript that context and headers exist
			const contextResult = result as { context: { headers: Headers } };
			expect(contextResult.context.headers).toBeInstanceOf(Headers);
			expect(contextResult.context.headers.get('X-Header-1')).toBe('value1');
			expect(contextResult.context.headers.get('X-Header-2')).toBe('value2');
		});

		test('should short-circuit when hook returns non-context result', async () => {
			const mockContext: MockHookContext = {
				path: '/test',
				// Add required properties to satisfy HookEndpointContext
				method: 'GET',
				body: {},
				query: {},
				params: {},
				request: {} as Request,
				context: {} as any,
			};

			const shortCircuitResponse = { data: 'short-circuit' };

			const hooks: Hook[] = [
				{
					matcher: (ctx: HookEndpointContext) => true,
					handler: vi.fn().mockResolvedValue(shortCircuitResponse),
				},
				{
					matcher: (ctx: HookEndpointContext) => true,
					handler: vi.fn().mockResolvedValue({
						context: { shouldNotRun: true },
					}),
				},
			];

			const result = await runBeforeHooks(
				mockContext as HookEndpointContext,
				hooks
			);

			expect(hooks[0]?.handler).toHaveBeenCalled();
			expect(hooks[1]?.handler).not.toHaveBeenCalled();

			expect(result).toBe(shortCircuitResponse);
		});
	});

	describe('runAfterHooks', () => {
		test('should run matching hooks and collect response modifications', async () => {
			const mockContext: MockHookContext = {
				path: '/test',
				method: 'GET',
				// @ts-expect-error - this is a test
				context: {
					returned: { original: true },
				},
				// Add required properties to satisfy HookEndpointContext
				body: {},
				query: {},
				params: {},
				request: {} as Request,
			};

			const modifiedResponse = { modified: true };

			const hooks: Hook[] = [
				{
					matcher: (ctx: HookEndpointContext) => ctx.path === '/test',
					handler: vi.fn().mockResolvedValue({
						response: modifiedResponse,
					}),
				},
				{
					matcher: (ctx: HookEndpointContext) => ctx.method === 'GET',
					handler: vi.fn().mockResolvedValue({}),
				},
				{
					matcher: (ctx: HookEndpointContext) => ctx.path === '/other',
					handler: vi.fn().mockResolvedValue({
						response: { shouldNotUse: true },
					}),
				},
			];

			const result = await runAfterHooks(
				mockContext as HookEndpointContext,
				hooks
			);

			// First two hooks should run, third should not
			expect(hooks[0]?.handler).toHaveBeenCalledWith(
				expect.objectContaining({
					path: '/test',
					method: 'GET',
					returnHeaders: true,
				})
			);
			expect(hooks[1]?.handler).toHaveBeenCalledWith(
				expect.objectContaining({
					path: '/test',
					method: 'GET',
					returnHeaders: true,
				})
			);
			expect(hooks[2]?.handler).not.toHaveBeenCalled();

			// Should use the response from the first hook
			expect(result.response).toBe(modifiedResponse);
		});

		test('should handle headers correctly', async () => {
			const mockContext: MockHookContext = {
				path: '/test',
				// Add required properties to satisfy HookEndpointContext
				method: 'GET',
				body: {},
				query: {},
				params: {},
				request: {} as Request,
				context: {} as any,
			};

			const headers1 = new Headers();
			headers1.set('X-Header-1', 'value1');

			const headers2 = new Headers();
			headers2.set('X-Header-2', 'value2');

			const hooks: Hook[] = [
				{
					matcher: (ctx: HookEndpointContext) => true,
					handler: vi.fn().mockResolvedValue({
						headers: headers1,
					}),
				},
				{
					matcher: (ctx: HookEndpointContext) => true,
					handler: vi.fn().mockResolvedValue({
						headers: headers2,
					}),
				},
			];

			const result = await runAfterHooks(
				mockContext as HookEndpointContext,
				hooks
			);

			expect(result.headers).toBeInstanceOf(Headers);
			if (result.headers) {
				expect(result.headers.get('X-Header-1')).toBe('value1');
				expect(result.headers.get('X-Header-2')).toBe('value2');
			}
		});

		test('should return null response and headers when no hooks match', async () => {
			const mockContext: MockHookContext = {
				path: '/test',
				// Add required properties to satisfy HookEndpointContext
				method: 'GET',
				body: {},
				query: {},
				params: {},
				request: {} as Request,
				context: {} as any,
			};

			const hooks: Hook[] = [
				{
					matcher: (ctx: HookEndpointContext) => false,
					handler: vi.fn(),
				},
			];

			const result = await runAfterHooks(
				mockContext as HookEndpointContext,
				hooks
			);

			expect(hooks[0]?.handler).not.toHaveBeenCalled();
			expect(result.response).toBeNull();
			expect(result.headers).toBeNull();
		});
	});
});
