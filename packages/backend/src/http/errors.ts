/**
 * Mapping from the package's typed failures to HTTP responses.
 *
 * The point of Effect's typed error channel is that every way a handler can
 * fail is in its signature. That only pays off if the translation to HTTP is
 * exhaustive — a `default: 500` swallows the guarantee and turns a known
 * failure into an opaque one. So this switch is total over the tagged errors,
 * and anything genuinely unexpected is a defect rather than a 500 with a
 * shrug.
 */

// oxlint-disable-next-line max-classes-per-file -- Preserve declaration order, interface shape, and public compatibility.
import { Data } from 'effect';
import type { SqlError } from 'effect/unstable/sql';

/** A request referenced something that does not exist. */
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
	readonly resource: string;
	readonly id: string;
}> {}

/** A request was structurally valid but semantically wrong. */
export class BadRequestError extends Data.TaggedError('BadRequestError')<{
	readonly message: string;
	/** Machine-readable code, matching what 2.x puts in `cause.code`. */
	readonly code: string;
}> {}

/**
 * A submitted policy snapshot token could not be verified.
 *
 * 409, matching 2.x: the request is well-formed, but the evidence it carries
 * does not describe a decision this server made.
 */
export class PolicySnapshotError extends Data.TaggedError(
	'PolicySnapshotError'
)<{
	readonly code:
		| 'POLICY_SNAPSHOT_REQUIRED'
		| 'POLICY_SNAPSHOT_INVALID'
		| 'POLICY_SNAPSHOT_EXPIRED';
	readonly message: string;
}> {}

/**
 * A save asserted a policy decision that no longer resolves.
 *
 * 422, matching 2.x's manifest-mode recompute-on-write: the inputs parsed,
 * but recomputing the decision from them disagrees with what the client
 * claims it saw, or the inputs are too partial to recompute at all.
 */
export class StalePolicyError extends Data.TaggedError('StalePolicyError')<{
	readonly message: string;
	readonly reason: string;
}> {}

/** Every failure a route is allowed to surface. */
export type RouteError =
	| NotFoundError
	| BadRequestError
	| PolicySnapshotError
	| StalePolicyError
	| SqlError.SqlError;

export interface HttpFailure {
	readonly status: 400 | 404 | 409 | 422 | 500;
	readonly body: {
		readonly message: string;
		readonly cause?: { readonly code: string; readonly reason?: string };
	};
}

export const toHttp = function toHttp(error: RouteError): HttpFailure {
	// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
	switch (error._tag) {
		case 'NotFoundError':
			return {
				body: {
					cause: { code: 'NOT_FOUND' },
					message: `${error.resource} not found`,
				},
				status: 404,
			};
		case 'BadRequestError':
			return {
				body: { cause: { code: error.code }, message: error.message },
				status: 400,
			};
		case 'PolicySnapshotError':
			return {
				body: { cause: { code: error.code }, message: error.message },
				status: 409,
			};
		case 'StalePolicyError':
			return {
				body: {
					cause: { code: 'STALE_POLICY', reason: error.reason },
					message: error.message,
				},
				status: 422,
			};
		case 'SqlError':
			// Deliberately opaque to the client: a database error message can
			// carry table and column names, and on a consent platform that is
			// information disclosure. The detail belongs in the wide event, not
			// the response body.
			return {
				body: {
					cause: { code: 'DATABASE_ERROR' },
					message: 'Internal server error',
				},
				status: 500,
			};
	}
};
