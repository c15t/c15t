/**
 * JSON-only bodies on the subject write routes.
 *
 * `c.req.json()` parses whatever text it is given, so without a check here
 * `POST /subjects` and `PATCH /subjects/:id` would read a JSON body sent as
 * `text/plain`, as a form, or with no type at all. 2.x refused those in its
 * request validator; this does the same, with 415, before the handler runs.
 *
 * The type also keeps writes inside the CORS allowlist. A browser sends a
 * cross-origin JSON body only after a preflight, which `trustedOrigins`
 * answers, while a `text/plain` or form body needs none.
 */

import type { MiddlewareHandler } from 'hono';

/** `application/json` or a `+json` type, with or without parameters. */
const JSON_CONTENT_TYPE = /^application\/(?:[\w.-]+\+)?json\s*(?:;|$)/iu;

/**
 * Whether a `Content-Type` header declares a JSON body.
 *
 * @param contentType - The header value, `undefined` when absent.
 * @returns `true` for `application/json` and `application/*+json`, with or
 * without parameters such as `charset`.
 * @internal
 */
export const isJsonContentType = function isJsonContentType(
	contentType: string | undefined
): boolean {
	return contentType !== undefined && JSON_CONTENT_TYPE.test(contentType);
};

/**
 * Refuses a request whose body is not declared as JSON, with
 * `415 UNSUPPORTED_MEDIA_TYPE`.
 *
 * @internal
 */
export const requireJsonBody: MiddlewareHandler =
	async function requireJsonBody(c, runNext) {
		if (!isJsonContentType(c.req.header('Content-Type'))) {
			return c.json(
				{
					cause: { code: 'UNSUPPORTED_MEDIA_TYPE' },
					message:
						'Request body must be JSON, sent with Content-Type: application/json',
				},
				415
			);
		}
		await runNext();
	};
