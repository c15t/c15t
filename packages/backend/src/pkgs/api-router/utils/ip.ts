import type { C15TOptions } from '~/types';
import { isTest } from '../../utils/env';

const DEFAULT_IP_HEADERS = [
	'x-client-ip',
	'x-forwarded-for',
	'cf-connecting-ip',
	'fastly-client-ip',
	'x-real-ip',
	'x-cluster-client-ip',
	'x-forwarded',
	'forwarded-for',
	'forwarded',
];

/**
 * Gets the client IP address from request headers
 *
 * This utility function extracts the client IP address from various standard and
 * non-standard headers found in HTTP requests. It respects privacy settings from
 * the configuration options and follows a fallback strategy when multiple
 * IP-related headers are present.
 *
 * @param req - The request object or headers to extract the IP from
 * @param options - Configuration options containing IP address settings
 * @returns The client IP address or null if tracking is disabled or no IP can be found
 *
 * @remarks
 * The function checks headers in the following order:
 * 1. Custom headers specified in options.advanced.ipAddress.ipAddressHeaders
 * 2. Standard headers like x-forwarded-for, cf-connecting-ip, etc.
 *
 * For headers that may contain multiple IPs (like x-forwarded-for), it takes the
 * first one in the list, which typically represents the client's actual IP.
 *
 * @example
 * ```typescript
 * // Get IP address from a Request object
 * const request = new Request('https://api.example.com');
 * const clientIp = getIp(request, {
 *   advanced: {
 *     ipAddress: {
 *       disableIpTracking: false,
 *       ipAddressHeaders: ['x-real-client-ip', 'x-forwarded-for']
 *     }
 *   }
 * });
 *
 * // Log the client IP if found
 * if (clientIp) {
 *   console.log(`Request from IP: ${clientIp}`);
 * } else {
 *   console.log('IP tracking disabled or IP not found');
 * }
 * ```
 */
export function getIp(
	req: Request | Headers,
	options: C15TOptions
): string | null {
	// Safe access to potentially undefined properties
	const advanced =
		(options.advanced as {
			ipAddress?: {
				disableIpTracking?: boolean;
				ipAddressHeaders?: string[];
			};
		}) || {};

	if (advanced?.ipAddress?.disableIpTracking) {
		return null;
	}

	const testIP = '127.0.0.1';
	if (isTest) {
		return testIP;
	}

	const ipHeaders = advanced?.ipAddress?.ipAddressHeaders || DEFAULT_IP_HEADERS;

	const headers = req instanceof Request ? req.headers : req;
	for (const key of ipHeaders) {
		const value = headers.get(key);
		if (value) {
			const ip = value.split(',')[0]?.trim();
			if (ip) {
				return ip;
			}
		}
	}
	return null;
}
