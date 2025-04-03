/**
 * Regex to strip protocol, trailing slashes, and port numbers from URLs
 */
export const STRIP_REGEX = /^(https?:\/\/)|(wss?:\/\/)|(\/+$)|:\d+/g;

/**
 * Validates if a given origin matches a trusted domain pattern
 *
 * @param origin - The origin to validate
 * @param trustedDomains - Array of trusted domain patterns (can include wildcard)
 * @returns boolean indicating if the origin is trusted
 */
export function isOriginTrusted(
	origin: string,
	trustedDomains: string[]
): boolean {
	try {
		// Special case: if "*" is in trusted domains, allow all origins
		if (trustedDomains.includes('*')) {
			return true;
		}

		// Parse the origin URL to get just the hostname
		const url = new URL(origin);
		const originHostname = url.hostname.toLowerCase();

		return trustedDomains.some((domain) => {
			// Handle empty domains (which might come from splitting empty strings)
			if (!domain || domain.trim() === '') {
				return false;
			}

			const strippedDomain = domain.replace(STRIP_REGEX, '').toLowerCase();

			if (strippedDomain.startsWith('*.')) {
				// For wildcard domains, ensure there is at least one subdomain
				const wildcardDomain = strippedDomain.slice(2); // Remove *. prefix
				const parts = originHostname.split('.');
				return parts.length > 2 && originHostname.endsWith(wildcardDomain);
			}

			return originHostname === strippedDomain;
		});
	} catch (error) {
		console.error('Error validating origin:', error);
		return false;
	}
}
