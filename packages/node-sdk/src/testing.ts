/**
 * Test helpers for code that uses `@c15t/node-sdk`.
 *
 * `createMockC15tClient` returns a full {@link C15tClient} whose methods call
 * the handlers you pass. Handler types come from the client, so a handler
 * that returns the wrong data or an error code its method cannot produce is
 * a type error.
 *
 * @example
 * ```ts
 * import { createMockC15tClient, err, ok } from '@c15t/node-sdk/testing';
 *
 * const c15t = createMockC15tClient({
 *   consents: {
 *     check: ({ types }) =>
 *       ok({
 *         results: Object.fromEntries(
 *           types.map((type) => [type, { hasConsent: true, isLatestPolicy: true }])
 *         ),
 *       }),
 *   },
 *   subjects: { get: () => err('NOT_FOUND') },
 * });
 * ```
 */

import type { ConsentPolicyType } from '@c15t/schema/types';

import type {
	C15tClient,
	C15tExperiments,
	C15tLegalDocuments,
	C15tSubjects,
} from './client';
import type { C15tCheckConsentInput } from './contract';
import { C15tError } from './errors';
import type { C15tErrorCode, C15tIssue, StalePolicyReason } from './errors';
import type { C15tCallOptions } from './options';
import type { C15tFailure, C15tResult, C15tSuccess } from './result';

type Awaitable<Value> = Value | Promise<Value>;

/** A handler with the same arguments as `Method`, sync or async. */
export type C15tMockHandler<Method> = Method extends (
	...args: infer Args
) => Promise<infer Result>
	? (...args: Args) => Awaitable<Result>
	: never;

/**
 * `consents.check` is generic over the requested types, which a plain
 * handler cannot be. Its handler returns results keyed by string; the mock
 * hands them back under the caller's narrowed type.
 */
export type C15tMockCheckConsentHandler = (
	input: C15tCheckConsentInput<readonly ConsentPolicyType[]>,
	options?: C15tCallOptions
) => Awaitable<
	C15tResult<
		{
			readonly results: Readonly<
				Record<
					string,
					{ readonly hasConsent: boolean; readonly isLatestPolicy: boolean }
				>
			>;
		},
		'DATABASE_ERROR' | 'EXTERNAL_ID_REQUIRED' | 'TYPE_REQUIRED' | 'UNAUTHORIZED'
	>
>;

/** Handlers for {@link createMockC15tClient}. Any method can be left out. */
export interface C15tMockHandlers {
	readonly status?: C15tMockHandler<C15tClient['status']>;
	readonly init?: C15tMockHandler<C15tClient['init']>;
	readonly manifest?: C15tMockHandler<C15tClient['manifest']>;
	readonly subjects?: {
		readonly [Name in keyof C15tSubjects]?: C15tMockHandler<C15tSubjects[Name]>;
	};
	readonly consents?: { readonly check?: C15tMockCheckConsentHandler };
	readonly experiments?: {
		readonly [Name in keyof C15tExperiments]?: C15tMockHandler<
			C15tExperiments[Name]
		>;
	};
	readonly legalDocuments?: {
		readonly [Name in keyof C15tLegalDocuments]?: C15tMockHandler<
			C15tLegalDocuments[Name]
		>;
	};
}

/**
 * Builds a successful result.
 *
 * @param data - The result's data.
 * @param init - Optional status, request id and headers.
 */
export const ok = function ok<Data>(
	data: Data,
	init: {
		readonly status?: number;
		readonly requestId?: string;
		readonly headers?: ConstructorParameters<typeof Headers>[0];
	} = {}
): C15tSuccess<Data> {
	return {
		data,
		headers: new Headers(init.headers),
		ok: true,
		requestId: init.requestId ?? 'mock-request-id',
		status: init.status ?? 200,
	};
};

/**
 * Builds a failed result. The code is checked against the method the
 * handler belongs to.
 *
 * @param code - Error code, such as `NOT_FOUND`.
 * @param init - Optional message, status and other error fields.
 */
export const err = function err<const Code extends C15tErrorCode>(
	code: Code,
	init: {
		readonly message?: string;
		readonly status?: number;
		readonly reason?: Code extends 'STALE_POLICY' ? StalePolicyReason : never;
		readonly requestId?: string;
		readonly retryable?: boolean;
		readonly issues?: readonly C15tIssue[];
		readonly serverCode?: string;
	} = {}
): C15tFailure<Code> {
	return {
		error: new C15tError({
			code,
			issues: init.issues,
			message: init.message ?? `Mock ${code} error.`,
			reason: init.reason,
			requestId: init.requestId ?? 'mock-request-id',
			retryable: init.retryable,
			serverCode: init.serverCode,
			status: init.status,
		}),
		ok: false,
	};
};

const missing = (name: string) => (): Promise<never> =>
	Promise.reject(
		new Error(
			`createMockC15tClient: ${name} was called but has no handler. Pass one in the handlers object.`
		)
	);

/**
 * Wraps a handler so it always returns a promise, like the real method, and
 * a missing one rejects with a message naming the method.
 */
const bind = <Args extends unknown[], Result>(
	name: string,
	handler: ((...args: Args) => Awaitable<Result>) | undefined
): ((...args: Args) => Promise<Result>) =>
	handler === undefined
		? (missing(name) as (...args: Args) => Promise<Result>)
		: async (...args: Args) => await handler(...args);

/**
 * Creates a client whose methods call the given handlers.
 *
 * A method without a handler rejects with an error naming it, so a test
 * fails loudly when code calls something the test did not expect.
 *
 * @param handlers - Handlers by namespace and method name.
 * @returns A full {@link C15tClient}.
 */
export const createMockC15tClient = function createMockC15tClient(
	handlers: C15tMockHandlers = {}
): C15tClient {
	return {
		consents: {
			check: bind('consents.check', handlers.consents?.check) as never,
		},
		experiments: {
			summary: bind('experiments.summary', handlers.experiments?.summary),
		},
		init: bind('init', handlers.init),
		legalDocuments: {
			publish: bind('legalDocuments.publish', handlers.legalDocuments?.publish),
		},
		manifest: bind('manifest', handlers.manifest),
		status: bind('status', handlers.status),
		subjects: {
			create: bind('subjects.create', handlers.subjects?.create),
			get: bind('subjects.get', handlers.subjects?.get),
			identify: bind('subjects.identify', handlers.subjects?.identify),
			list: bind('subjects.list', handlers.subjects?.list),
		},
	};
};
