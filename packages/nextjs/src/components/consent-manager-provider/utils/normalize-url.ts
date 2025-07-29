const ABSOLUTE_URL_REGEX = /^https?:\/\//;

function trimTrailingSlash(url: string): string {
	// Don't trim if it's just the root path "/"
	if (url === '/') {
		return url;
	}

	// Remove trailing slash if present
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function validateBackendURL(backendURL: string): {
	isAbsolute: boolean;
	normalizedURL: string;
} {
	// Check if URL is absolute (starts with protocol)
	const isAbsolute = ABSOLUTE_URL_REGEX.test(backendURL);

	if (isAbsolute) {
		// Validate that the URL is valid
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

		if (process.env.NODE_ENV === 'development') {
			console.warn('Could not determine base URL for relative backend URL');
		}
		return null;
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('Invalid backend URL:', error);
		}
		return null;
	}
}
