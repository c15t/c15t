/**
 * API key validation utilities.
 *
 * @packageDocumentation
 */

/**
 * Extracts the Bearer token from an Authorization header.
 *
 * @param authHeader - The Authorization header value
 * @returns The token if valid Bearer format, null otherwise
 *
 * @example
 * ```typescript
 * extractBearerToken('Bearer sk_live_abc123'); // 'sk_live_abc123'
 * extractBearerToken('Basic abc123'); // null
 * extractBearerToken('sk_live_abc123'); // null
 * ```
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

/**
 * Validates an API key against the configured keys.
 *
 * @param token - The token to validate
 * @param validKeys - Array of valid API keys
 * @returns True if the token is valid
 *
 * @remarks
 * Uses timing-safe comparison to prevent timing attacks.
 * If no keys are configured, returns false.
 */
export function validateApiKey(
	token: string | null,
	validKeys: string[] | undefined
): boolean {
	if (!token || !validKeys || validKeys.length === 0) {
		return false;
	}

	// Use timing-safe comparison to prevent timing attacks
	return validKeys.some((key) => timingSafeEqual(token, key));
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		// Still do comparison to maintain constant time
		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
		}
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Validates authentication from request headers.
 *
 * @param headers - Request headers
 * @param validKeys - Array of valid API keys
 * @returns True if the request has a valid API key
 *
 * @example
 * ```typescript
 * const headers = new Headers();
 * headers.set('Authorization', 'Bearer sk_live_abc123');
 *
 * validateRequestAuth(headers, ['sk_live_abc123']); // true
 * validateRequestAuth(headers, ['sk_live_other']); // false
 * ```
 */
export function validateRequestAuth(
	headers: Headers | undefined,
	validKeys: string[] | undefined
): boolean {
	if (!headers) {
		return false;
	}

	const authHeader = headers.get('Authorization');
	const token = extractBearerToken(authHeader);
	return validateApiKey(token, validKeys);
}
