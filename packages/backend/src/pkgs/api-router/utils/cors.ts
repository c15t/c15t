import type { Logger } from '@doubletie/logger';

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
	trustedDomains: string[],
	logger?: Logger
): boolean {
	try {
		if (trustedDomains.length === 0) {
			throw new Error('No trusted domains');
		}

		logger?.debug(
			`Checking if origin ${origin} is trusted in ${trustedDomains}`
		);

		// Special case: if "*" is in trusted domains, allow all origins
		if (trustedDomains.includes('*')) {
			logger?.debug('Allowing all origins');
			return true;
		}

		// Parse the origin URL to get just the hostname
		const url = new URL(origin);
		const originHostname = url.hostname.toLowerCase();
		logger?.debug(`Parsed origin hostname: ${originHostname}`);

		return trustedDomains.some((domain) => {
			// Handle empty domains (which might come from splitting empty strings)
			if (!domain || domain.trim() === '') {
				logger?.debug('Skipping empty domain');
				return false;
			}

			const strippedDomain = domain.replace(STRIP_REGEX, '').toLowerCase();
			logger?.debug(`Checking against stripped domain: ${strippedDomain}`);

			if (strippedDomain.startsWith('*.')) {
				// For wildcard domains, ensure there is at least one subdomain
				const wildcardDomain = strippedDomain.slice(2); // Remove *. prefix
				const parts = originHostname.split('.');

				const isValid =
					parts.length > 2 && originHostname.endsWith(wildcardDomain);
				logger?.debug(
					`Wildcard match result: ${isValid} ${originHostname} ends with ${wildcardDomain} ${parts.length > 2} ${originHostname.endsWith(wildcardDomain)}`
				);
				return isValid;
			}

			const isMatch = originHostname === strippedDomain;
			logger?.debug(
				`Exact match result: ${isMatch} ${originHostname} === ${strippedDomain}`
			);
			return isMatch;
		});
	} catch (error) {
		logger?.error('Error validating origin:', error);
		return false;
	}
}
