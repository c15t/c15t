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

/** Every failure a route is allowed to surface. */
export type RouteError = NotFoundError | BadRequestError | SqlError.SqlError;

export interface HttpFailure {
	readonly status: 400 | 404 | 500;
	readonly body: {
		readonly message: string;
		readonly cause?: { readonly code: string };
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
