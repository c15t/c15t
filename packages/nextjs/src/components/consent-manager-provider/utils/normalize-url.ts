const ABSOLUTE_URL_REGEX = /^https?:\/\//;

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
			normalizedURL: backendURL,
		};
	}

	if (backendURL.startsWith('/')) {
		return {
			isAbsolute: false,
			normalizedURL: backendURL,
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
			return `${protocol}://${host}${validated}`;
		}

		if (referer) {
			const refererUrl = new URL(referer);
			return `${refererUrl.protocol}//${refererUrl.host}${validated}`;
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
