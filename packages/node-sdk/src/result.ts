import type { C15tClientErrorCode, C15tError } from './errors';

/** A call that succeeded. */
export interface C15tSuccess<Data> {
	readonly ok: true;
	readonly data: Data;
	/** HTTP status of the response. */
	readonly status: number;
	/** The `x-request-id` the call sent. */
	readonly requestId: string;
	readonly headers: Headers;
}

/** A call that failed. */
export interface C15tFailure<Code extends string> {
	readonly ok: false;
	readonly error: C15tError<Code>;
}

/**
 * What every client method resolves to. Methods never reject.
 *
 * `ApiCode` lists the backend codes the method's endpoint can return; the
 * client's own codes are always included.
 *
 * @example
 * ```ts
 * const result = await c15t.subjects.get(id);
 * if (result.ok) {
 *   result.data.consents; // narrowed: data exists, error does not
 * } else {
 *   result.error.code; // 'NOT_FOUND' | 'DATABASE_ERROR' | C15tClientErrorCode
 * }
 * ```
 */
export type C15tResult<Data, ApiCode extends string = never> =
	| C15tSuccess<Data>
	| C15tFailure<ApiCode | C15tClientErrorCode>;

/** Anything that returns a {@link C15tResult}, sync or async. */
type ResultReturning = (
	...args: never[]
) => C15tResult<unknown, string> | Promise<C15tResult<unknown, string>>;

/**
 * The `data` type of a client method.
 *
 * @example
 * ```ts
 * type Subject = C15tDataOf<typeof c15t.subjects.get>;
 * ```
 */
export type C15tDataOf<Method extends ResultReturning> =
	Extract<Awaited<ReturnType<Method>>, { ok: true }> extends C15tSuccess<
		infer Data
	>
		? Data
		: never;

/**
 * Every error code a client method can return.
 *
 * @example
 * ```ts
 * type GetSubjectError = C15tErrorCodeOf<typeof c15t.subjects.get>;
 * ```
 */
export type C15tErrorCodeOf<Method extends ResultReturning> =
	Extract<Awaited<ReturnType<Method>>, { ok: false }> extends C15tFailure<
		infer Code
	>
		? Code
		: never;

/**
 * Returns the data of a successful result, or throws its {@link C15tError}.
 *
 * Use it where a failure should abort the surrounding work, such as a job
 * that has its own retry.
 *
 * @param result - A client method's result.
 * @returns The result's `data`.
 * @throws {C15tError} The result's error, with its code narrowed to the
 * method's codes.
 *
 * @example
 * ```ts
 * const { results } = unwrap(
 *   await c15t.consents.check({ externalId, types: ['marketing_communications'] })
 * );
 * ```
 */
export const unwrap = function unwrap<Data, Code extends string>(
	result: C15tSuccess<Data> | C15tFailure<Code>
): Data {
	if (result.ok) {
		return result.data;
	}
	throw result.error;
};
