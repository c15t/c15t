/**
 * API key authentication.
 *
 * Deliberately a faithful port of `@c15t/backend`'s
 * `middleware/auth/validate-api-key.ts` rather than an improvement on it.
 * During the parallel phase both backends serve the same tenants with the same
 * configured keys, and an auth decision that differed between them would mean
 * a key accepted by one and rejected by the other — or worse, the reverse.
 * `auth.test.ts` pins the agreement across a matrix of inputs.
 *
 * The comparison is timing-safe in the same way and to the same degree as the
 * original: equal-length keys are compared in constant time, and unequal
 * lengths still run a loop before returning. That last part does not fully
 * hide length, which is a known limitation of comparing JavaScript strings
 * this way rather than an oversight — it is preserved because changing it
 * would change behaviour, and any improvement belongs in both packages at
 * once.
 */

/**
 * Pulls the token out of an `Authorization: Bearer <token>` header.
 *
 * Returns null for any other scheme, a malformed header, or an empty token.
 */
export function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) {
		return null;
	}

	const parts = authHeader.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') {
		return null;
	}

	return parts[1] || null;
}

/** Constant-time comparison for equal-length strings. */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		// Still iterate, so a length mismatch does not return measurably
		// faster than a content mismatch.
		let result = 0;
		for (let index = 0; index < a.length; index++) {
			result |= a.charCodeAt(index) ^ (b.charCodeAt(index % b.length) || 0);
		}
		return false;
	}

	let result = 0;
	for (let index = 0; index < a.length; index++) {
		result |= a.charCodeAt(index) ^ b.charCodeAt(index);
	}
	return result === 0;
}

/**
 * Checks a token against the configured keys.
 *
 * With no keys configured this returns false rather than true: an unconfigured
 * deployment authenticates nobody, instead of everybody.
 */
export function validateApiKey(
	token: string | null,
	validKeys: readonly string[] | undefined
): boolean {
	if (!token || !validKeys || validKeys.length === 0) {
		return false;
	}

	return validKeys.some((key) => timingSafeEqual(token, key));
}

/** Whether a request carries a valid API key. */
export function validateRequestAuth(
	headers: Headers | undefined,
	validKeys: readonly string[] | undefined
): boolean {
	if (!headers) {
		return false;
	}

	return validateApiKey(
		extractBearerToken(headers.get('Authorization')),
		validKeys
	);
}
