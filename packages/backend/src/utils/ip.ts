import type { C15TOptions } from '~/pkgs/types';
import { isTest } from './env';

/**
 * Gets the client IP address from request headers
 *
 * @param req - The request object or headers
 * @param options - C15T options containing IP address configuration
 * @returns The client IP address or null if tracking is disabled
 */
export function getIp(
	req: Request | Headers,
	options: C15TOptions
): string | null {
	if (options.advanced?.ipAddress?.disableIpTracking) {
		return null;
	}
	const testIP = '127.0.0.1';
	if (isTest) {
		return testIP;
	}
	const ipHeaders = options.advanced?.ipAddress?.ipAddressHeaders;
	const keys = ipHeaders || [
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
	const headers = req instanceof Request ? req.headers : req;
	for (const key of keys) {
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
