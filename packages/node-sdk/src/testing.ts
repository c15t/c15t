/**
 * Testing utilities for @c15t/node-sdk
 *
 * These utilities help users mock the C15T client in their tests.
 *
 * @example
 * ```typescript
 * import { createMockClient, createMockResponse } from '@c15t/node-sdk/testing';
 *
 * const mockClient = createMockClient({
 *   getSubject: async () => createMockResponse({ id: 'sub_123', consents: [] }),
 * });
 *
 * // Use mockClient in your tests
 * const result = await mockClient.getSubject('sub_123');
 * expect(result.data?.id).toBe('sub_123');
 * ```
 */

import type { ResponseContext } from './types';

const assignInOrder = Object.assign;

/**
 * Creates a mock ResponseContext for testing
 *
 * @param data - The data to return in the response
 * @param options - Optional configuration for the mock response
 * @returns A ResponseContext object
 *
 * @example
 * ```typescript
 * const response = createMockResponse({ id: 'sub_123' });
 * expect(response.ok).toBe(true);
 * expect(response.data?.id).toBe('sub_123');
 * ```
 */
export const createMockResponse = function createMockResponse<T>(
	data: T,
	options: {
		ok?: boolean;
		error?: {
			message: string;
			status: number;
			code?: string;
			details?: Record<string, unknown> | null;
		};
		response?: Response;
	} = {}
): ResponseContext<T> {
	const isSuccess = options.ok ?? true;
	const error = options.error ?? null;
	const response = options.response ?? null;

	return {
		data: isSuccess ? data : null,
		error,
		expect(message: string): T {
			if (!isSuccess || data === null) {
				throw new Error(message);
			}
			return data;
		},
		map<U>(fn: (d: T) => U): ResponseContext<U> {
			if (!isSuccess || data === null) {
				return createMockResponse<U>(null as U, {
					error: error ?? undefined,
					ok: false,
				});
			}
			return createMockResponse<U>(fn(data));
		},
		ok: isSuccess,
		response,
		unwrap(): T {
			if (!isSuccess || data === null) {
				throw new Error(error?.message || 'Request failed');
			}
			return data;
		},
		unwrapOr(defaultValue: T): T {
			if (!isSuccess || data === null) {
				return defaultValue;
			}
			return data;
		},
	};
};

/**
 * Creates a mock error ResponseContext for testing
 *
 * @param error - The error details
 * @returns A ResponseContext object representing an error
 *
 * @example
 * ```typescript
 * const response = createMockErrorResponse({
 *   message: 'Not found',
 *   status: 404,
 *   code: 'NOT_FOUND',
 * });
 * expect(response.ok).toBe(false);
 * expect(response.error?.status).toBe(404);
 * ```
 */
export const createMockErrorResponse = function createMockErrorResponse<
	T = unknown,
>(error: {
	message: string;
	status: number;
	code?: string;
	details?: Record<string, unknown> | null;
}): ResponseContext<T> {
	return createMockResponse<T>(null as T, { error, ok: false });
};

/**
 * Type for mock method implementations
 */
export type MockMethodImplementation<TInput, TOutput> = (
	input: TInput
) => ResponseContext<TOutput> | Promise<ResponseContext<TOutput>>;

/**
 * Type for mock client overrides
 */
export interface MockClientOverrides {
	status?: MockMethodImplementation<void, unknown>;
	init?: MockMethodImplementation<void, unknown>;
	checkConsent?: MockMethodImplementation<unknown, unknown>;
	createSubject?: MockMethodImplementation<unknown, unknown>;
	getSubject?: MockMethodImplementation<string, unknown>;
	patchSubject?: MockMethodImplementation<unknown, unknown>;
	listSubjects?: MockMethodImplementation<unknown, unknown>;
}

/**
 * Creates a mock C15T client for testing
 *
 * @param overrides - Method implementations to override
 * @returns A mock client object
 *
 * @example
 * ```typescript
 * const mockClient = createMockClient({
 *   getSubject: async (id) => createMockResponse({
 *     id,
 *     externalId: 'user_123',
 *     consents: [],
 *   }),
 *   checkConsent: async () => createMockResponse({
 *     results: { analytics: { hasConsent: true } },
 *   }),
 * });
 *
 * // Use in tests
 * const result = await mockClient.getSubject('sub_123');
 * ```
 */
export const createMockClient = function createMockClient(
	overrides: MockClientOverrides = {}
) {
	const defaultNotImplemented = () =>
		createMockErrorResponse({
			code: 'NOT_IMPLEMENTED',
			message: 'Method not implemented in mock',
			status: 501,
		});

	const status = overrides.status ?? defaultNotImplemented;
	const init = overrides.init ?? defaultNotImplemented;
	const checkConsent = overrides.checkConsent ?? defaultNotImplemented;
	const createSubject = overrides.createSubject ?? defaultNotImplemented;
	const getSubject = overrides.getSubject ?? defaultNotImplemented;
	const patchSubject = overrides.patchSubject ?? defaultNotImplemented;
	const listSubjects = overrides.listSubjects ?? defaultNotImplemented;

	return assignInOrder(
		{},
		{ status: () => Promise.resolve(status()) },
		{ init: () => Promise.resolve(init()) },
		{ checkConsent: (query: unknown) => Promise.resolve(checkConsent(query)) },
		{
			createSubject: (input: unknown) => Promise.resolve(createSubject(input)),
		},
		{ getSubject: (id: string) => Promise.resolve(getSubject(id)) },
		{
			patchSubject: (id: string, input: unknown) => {
				const patchInput = { id };
				if (typeof input === 'object' && input !== null) {
					Object.assign(patchInput, input);
				}

				return Promise.resolve(patchSubject(patchInput));
			},
		},
		{ listSubjects: (query?: unknown) => Promise.resolve(listSubjects(query)) },
		{
			consent: {
				check: (query: unknown) => Promise.resolve(checkConsent(query)),
			},
		},
		{
			subjects: {
				create: (input: unknown) => Promise.resolve(createSubject(input)),
				get: (id: string) => Promise.resolve(getSubject(id)),
				list: (query?: unknown) => Promise.resolve(listSubjects(query)),
				patch: (id: string, input: unknown) => {
					const patchInput = { id };
					if (typeof input === 'object' && input !== null) {
						Object.assign(patchInput, input);
					}

					return Promise.resolve(patchSubject(patchInput));
				},
			},
		},
		{
			meta: {
				init: () => Promise.resolve(init()),
				status: () => Promise.resolve(status()),
			},
		}
	);
};

/**
 * Type representing the mock client returned by createMockClient
 */
export type MockC15TClient = ReturnType<typeof createMockClient>;
