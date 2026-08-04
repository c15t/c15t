import { getIpAddress as sharedGetIpAddress } from '@c15t/schema/geo';
import type { C15TOptions } from '~/types';

export { maskIpAddress } from '@c15t/schema/geo';

/**
 * Extracts the client IP for these options.
 *
 * Delegates to `@c15t/schema` so there is exactly one implementation. The IP
 * is stored on every consent record, so two backends deriving different values
 * for the same visitor would put inconsistent data in the audit trail during
 * RFC 0004's parallel phase.
 */
export function getIpAddress(
	req: Request | Headers,
	options: C15TOptions
): string | null {
	return sharedGetIpAddress(req, options.ipAddress);
}
