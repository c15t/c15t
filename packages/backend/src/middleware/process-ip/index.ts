import type { C15TOptions } from '~/types';

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

export function getIpAddress(
	req: Request | Headers,
	options: C15TOptions
): string | 'unknown' {
	const ipAddress = options.advanced?.ipAddress;

	if (ipAddress?.disableIpTracking) {
		return 'unknown';
	}

	const ipHeaders = ipAddress?.ipAddressHeaders || DEFAULT_IP_HEADERS;

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

	return 'unknown';
}
