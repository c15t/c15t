const ABSOLUTE_URL_REGEX = /^https?:\/\//;

function trimTrailingSlash(url: string): string {
	if (url === '/') {
		return url;
	}
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Validates and normalizes a backend URL.
 *
 * @param backendURL - The URL to validate (absolute or relative)
 * @returns An object with isAbsolute flag and the normalized URL
 * @throws {Error} If the URL format is invalid
 *
 * @public
 */
export function validateBackendURL(backendURL: string): {
	isAbsolute: boolean;
	normalizedURL: string;
} {
	const isAbsolute = ABSOLUTE_URL_REGEX.test(backendURL);

	if (isAbsolute) {
		new URL(backendURL);

		return {
			isAbsolute: true,
			normalizedURL: trimTrailingSlash(backendURL),
		};
	}

	if (backendURL.startsWith('/')) {
		return {
			isAbsolute: false,
			normalizedURL: trimTrailingSlash(backendURL),
		};
	}

	throw new Error(
		`Invalid URL format: ${backendURL}. URL must be absolute (https://...) or relative starting with (/)`
	);
}

/**
 * Normalizes a backend URL, resolving relative URLs using request headers.
 *
 * @param backendURL - The backend URL (absolute or relative)
 * @param headersList - The Headers object from the incoming request
 * @returns The normalized absolute URL, or null if it cannot be determined
 *
 * @public
 */
export function normalizeBackendURL(
	backendURL: string,
	headersList: Headers
): string | null {
	try {
		const { normalizedURL: validated, isAbsolute } =
			validateBackendURL(backendURL);

		if (isAbsolute) {
			return validated;
		}

		const referer = headersList.get('referer');
		const protocol = headersList.get('x-forwarded-proto') || 'https';
		const host = headersList.get('x-forwarded-host') || headersList.get('host');

		if (host) {
			return trimTrailingSlash(`${protocol}://${host}${validated}`);
		}

		if (referer) {
			const refererUrl = new URL(referer);
			return trimTrailingSlash(
				`${refererUrl.protocol}//${refererUrl.host}${validated}`
			);
		}

		return null;
	} catch {
		return null;
	}
}
