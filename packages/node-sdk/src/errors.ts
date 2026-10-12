/**
 * Error codes and the error classes the client returns or throws.
 *
 * API codes are the backend's own, copied verbatim from `cause.code` in its
 * error body. Client codes describe failures that happen on this side of the
 * wire. Both stay SCREAMING_CASE so a caller sees one vocabulary.
 */

/**
 * Every code the c15t backend can put in `cause.code`.
 *
 * Each method narrows this to the codes its endpoint can actually return.
 */
export const C15T_API_ERROR_CODES = [
	'BAD_REQUEST',
	'CHOICE_OUT_OF_SCOPE',
	'CHOICE_PREFERENCE_MISMATCH',
	'CONFLICT',
	'DATABASE_ERROR',
	'EXTERNAL_ID_REQUIRED',
	'IDENTITY_CONFLICT',
	'IDENTITY_TOKEN_INVALID',
	'INPUT_VALIDATION_FAILED',
	'NOT_FOUND',
	'POLICY_SNAPSHOT_EXPIRED',
	'POLICY_SNAPSHOT_INVALID',
	'POLICY_SNAPSHOT_REQUIRED',
	'PURPOSE_NOT_ALLOWED',
	'SERVICE_UNAVAILABLE',
	'STALE_POLICY',
	'SUBJECT_CONFLICT',
	'TYPE_REQUIRED',
	'UNAUTHORIZED',
] as const;

/** A code the c15t backend can return. */
export type C15tApiErrorCode = (typeof C15T_API_ERROR_CODES)[number];

/**
 * Failures every method can return, whichever endpoint it calls.
 *
 * - `INVALID_INPUT`: the input failed validation; nothing was sent.
 * - `MISSING_API_KEY`: the endpoint needs an API key and the client has none;
 *   nothing was sent.
 * - `NETWORK_ERROR`: the request failed before a response arrived.
 * - `TIMEOUT`: one attempt exceeded `timeoutMs`, body read included.
 * - `ABORTED`: the caller's `signal` aborted the call.
 * - `UNEXPECTED_RESPONSE`: a response this endpoint does not document, such as
 *   a proxy's HTML error page, an undeclared error code (kept in
 *   `serverCode`), or a body that could not be decoded.
 */
export const C15T_CLIENT_ERROR_CODES = [
	'ABORTED',
	'INVALID_INPUT',
	'MISSING_API_KEY',
	'NETWORK_ERROR',
	'TIMEOUT',
	'UNEXPECTED_RESPONSE',
] as const;

/** A failure produced by the client rather than the backend. */
export type C15tClientErrorCode = (typeof C15T_CLIENT_ERROR_CODES)[number];

/** Any code a {@link C15tError} can carry. */
export type C15tErrorCode = C15tApiErrorCode | C15tClientErrorCode;

/** Why the backend refused a consent as `STALE_POLICY`. */
export type StalePolicyReason =
	| 'decision-mismatch'
	| 'incomplete-inputs'
	| 'policy-changed';

/**
 * Narrows a wire value to a documented stale-policy reason.
 * @internal
 */
export const isStalePolicyReason = (
	value: unknown
): value is StalePolicyReason =>
	value === 'decision-mismatch' ||
	value === 'incomplete-inputs' ||
	value === 'policy-changed';

/** One input validation problem, as the schema reported it. */
export interface C15tIssue {
	readonly message: string;
	/** Path into the input, such as `['preferences', 'analytics']`. */
	readonly path?: readonly PropertyKey[];
}

/**
 * `reason` is only ever set for `STALE_POLICY`, so it is typed that way: a
 * `C15tError<'NOT_FOUND'>` has no reason to read.
 */
type ReasonFor<Code extends string> = Code extends 'STALE_POLICY'
	? StalePolicyReason | undefined
	: undefined;

/** Fields used to build a {@link C15tError}. */
export interface C15tErrorInit<Code extends string> {
	readonly code: Code;
	readonly message: string;
	readonly status?: number | undefined;
	readonly reason?: StalePolicyReason | undefined;
	readonly requestId?: string | undefined;
	readonly retryable?: boolean | undefined;
	readonly issues?: readonly C15tIssue[] | undefined;
	readonly serverCode?: string | undefined;
	readonly cause?: unknown;
}

/**
 * A failed call.
 *
 * Methods return it inside `{ ok: false, error }` rather than throwing it;
 * {@link unwrap} throws it. `Code` is the union of codes the failing method
 * can produce, so a `switch (error.code)` is checked for exhaustiveness.
 *
 * @example
 * ```ts
 * const result = await c15t.subjects.get(id);
 * if (!result.ok) {
 *   switch (result.error.code) {
 *     case 'NOT_FOUND':
 *       return null;
 *     default:
 *       throw result.error;
 *   }
 * }
 * ```
 */
export class C15tError<Code extends string = C15tErrorCode> extends Error {
	override readonly name = 'C15tError';

	/** Stable, machine-readable failure code. */
	readonly code: Code;

	/** HTTP status, when a response arrived. */
	readonly status: number | undefined;

	/** Refinement of `STALE_POLICY`; `undefined` for every other code. */
	readonly reason: ReasonFor<Code>;

	/**
	 * The `x-request-id` the call sent, for matching backend logs. Absent when
	 * nothing was sent (`INVALID_INPUT`, `MISSING_API_KEY`).
	 */
	readonly requestId: string | undefined;

	/**
	 * Whether repeating the same call could succeed. The client already
	 * retried idempotent endpoints before returning this.
	 */
	readonly retryable: boolean;

	/** Validation problems, set for `INVALID_INPUT`. */
	readonly issues: readonly C15tIssue[] | undefined;

	/**
	 * The raw `cause.code` when the backend sent one this endpoint does not
	 * document. Set only for `UNEXPECTED_RESPONSE`.
	 */
	readonly serverCode: string | undefined;

	constructor(init: C15tErrorInit<Code>) {
		super(init.message, init.cause === undefined ? {} : { cause: init.cause });
		this.code = init.code;
		this.status = init.status;
		this.reason = (
			init.code === 'STALE_POLICY' && isStalePolicyReason(init.reason)
				? init.reason
				: undefined
		) as ReasonFor<Code>;
		this.requestId = init.requestId;
		this.retryable = init.retryable ?? false;
		this.issues = init.issues;
		this.serverCode = init.serverCode;
	}

	/** Plain object for logging and serialization. `cause` is left out. */
	toJSON(): {
		readonly name: 'C15tError';
		readonly code: Code;
		readonly message: string;
		readonly status: number | undefined;
		readonly reason: ReasonFor<Code>;
		readonly requestId: string | undefined;
		readonly retryable: boolean;
		readonly issues: readonly C15tIssue[] | undefined;
		readonly serverCode: string | undefined;
	} {
		return {
			code: this.code,
			issues: this.issues,
			message: this.message,
			name: this.name,
			reason: this.reason,
			requestId: this.requestId,
			retryable: this.retryable,
			serverCode: this.serverCode,
			status: this.status,
		};
	}
}

/**
 * Checks whether a value is a {@link C15tError}, optionally with one of the
 * given codes.
 *
 * @param error - Any caught value.
 * @param codes - Codes to match. With none, any `C15tError` matches.
 * @returns `true` when `error` is a `C15tError` whose code is in `codes`.
 *
 * @example
 * ```ts
 * try {
 *   unwrap(await c15t.subjects.get(id));
 * } catch (error) {
 *   if (isC15tError(error, 'NOT_FOUND')) {
 *     // error.code is 'NOT_FOUND'
 *   }
 * }
 * ```
 */
export function isC15tError<const Codes extends readonly C15tErrorCode[]>(
	error: unknown,
	...codes: Codes
): error is C15tError<
	Codes extends readonly [] ? C15tErrorCode : Codes[number]
>;
export function isC15tError(
	error: unknown,
	...codes: readonly string[]
): boolean {
	if (!(error instanceof C15tError)) {
		return false;
	}
	return codes.length === 0 || codes.includes(error.code);
}
