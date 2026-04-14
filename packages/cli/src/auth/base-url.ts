import { URLS } from '../constants';

/**
 * Resolve the control-plane base URL for auth + hosted project management.
 *
 * Default: inth.com
 * Override: CONSENT_URL
 */
export function getControlPlaneBaseUrl(): string {
	const envValue = process.env.CONSENT_URL?.trim();
	if (!envValue) {
		return URLS.CONSENT_IO;
	}

	return envValue.replace(/\/+$/, '');
}
