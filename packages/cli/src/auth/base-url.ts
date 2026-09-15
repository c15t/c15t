import { URLS } from '../constants';

/** Removes trailing slashes without rescanning slash runs inside the URL. @internal */
export const normalizeControlPlaneBaseUrl =
	function normalizeControlPlaneBaseUrl(baseUrl: string): string {
		let end = baseUrl.length;
		while (end > 0 && baseUrl[end - 1] === '/') {
			end -= 1;
		}
		return baseUrl.slice(0, end);
	};

/**
 * Resolve the control-plane base URL for auth + hosted project management.
 *
 * Default: inth.com
 * Override: CONSENT_URL
 */
export const getControlPlaneBaseUrl =
	function getControlPlaneBaseUrl(): string {
		const envValue = process.env.CONSENT_URL?.trim();
		if (!envValue) {
			return URLS.CONSENT_IO;
		}

		return normalizeControlPlaneBaseUrl(envValue);
	};

/** Normalize the issuer used to scope locally stored credentials. */
export const getControlPlaneOrigin = (
	baseUrl = getControlPlaneBaseUrl()
): string => {
	const url = new URL(baseUrl);
	if (
		url.protocol !== 'https:' &&
		!(
			url.protocol === 'http:' &&
			['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
		)
	) {
		throw new Error('Control-plane URLs must use HTTPS, except on localhost.');
	}
	if (url.username || url.password) {
		throw new Error('Control-plane URLs must not contain credentials.');
	}
	return url.origin;
};
