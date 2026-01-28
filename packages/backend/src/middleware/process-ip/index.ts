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

/**
 * Expands a compressed IPv6 address to its full form.
 * For example: "2001:db8::1" -> "2001:0db8:0000:0000:0000:0000:0000:0001"
 */
function expandIPv6(ip: string): string {
	// Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:192.168.1.1)
	if (ip.includes('.')) {
		return ip;
	}

	const parts = ip.split(':');
	const emptyIndex = parts.indexOf('');

	if (emptyIndex !== -1) {
		// Count how many groups we need to insert
		const nonEmptyParts = parts.filter((p) => p !== '');
		const missingGroups = 8 - nonEmptyParts.length;
		const zeros = Array(missingGroups).fill('0000');

		// Handle leading ::
		if (emptyIndex === 0) {
			parts.shift();
			if (parts[0] === '') {
				parts.shift();
			}
			parts.unshift(...zeros);
		}
		// Handle trailing ::
		else if (emptyIndex === parts.length - 1) {
			parts.pop();
			if (parts[parts.length - 1] === '') {
				parts.pop();
			}
			parts.push(...zeros);
		}
		// Handle middle ::
		else {
			parts.splice(emptyIndex, 1, ...zeros);
		}
	}

	// Pad each group to 4 characters
	return parts.map((p) => p.padStart(4, '0')).join(':');
}

/**
 * Compresses an IPv6 address by removing leading zeros and using :: for consecutive zero groups.
 */
function compressIPv6(ip: string): string {
	// Remove leading zeros from each group
	const groups = ip.split(':').map((g) => g.replace(/^0+/, '') || '0');

	// Find the longest run of consecutive zeros
	let longestStart = -1;
	let longestLength = 0;
	let currentStart = -1;
	let currentLength = 0;

	for (let i = 0; i < groups.length; i++) {
		if (groups[i] === '0') {
			if (currentStart === -1) {
				currentStart = i;
				currentLength = 1;
			} else {
				currentLength++;
			}
		} else {
			if (currentLength > longestLength) {
				longestStart = currentStart;
				longestLength = currentLength;
			}
			currentStart = -1;
			currentLength = 0;
		}
	}

	// Check final run
	if (currentLength > longestLength) {
		longestStart = currentStart;
		longestLength = currentLength;
	}

	// Replace longest run with ::
	if (longestLength > 1) {
		const before = groups.slice(0, longestStart);
		const after = groups.slice(longestStart + longestLength);

		if (before.length === 0 && after.length === 0) {
			return '::';
		}
		if (before.length === 0) {
			return `::${after.join(':')}`;
		}
		if (after.length === 0) {
			return `${before.join(':')}::`;
		}
		return `${before.join(':')}::${after.join(':')}`;
	}

	return groups.join(':');
}

/**
 * Masks an IP address to reduce PII.
 * - IPv4: Replaces last octet with 0 (e.g., 192.168.1.100 -> 192.168.1.0)
 * - IPv6: Masks last 80 bits (e.g., 2001:db8:85a3::1 -> 2001:db8:85a3::)
 *
 * @param ip - The IP address to mask
 * @returns The masked IP address
 */
export function maskIpAddress(ip: string): string {
	// Handle 'unknown' or empty
	if (!ip || ip === 'unknown') {
		return ip;
	}

	// IPv4 detection (no colons, has dots)
	if (ip.includes('.') && !ip.includes(':')) {
		const parts = ip.split('.');
		if (parts.length === 4) {
			parts[3] = '0';
			return parts.join('.');
		}
		return ip;
	}

	// IPv6 detection
	if (ip.includes(':')) {
		// Handle IPv4-mapped IPv6 (::ffff:192.168.1.100)
		if (ip.includes('.')) {
			const lastColon = ip.lastIndexOf(':');
			const ipv4Part = ip.substring(lastColon + 1);
			const ipv6Prefix = ip.substring(0, lastColon + 1);

			const ipv4Parts = ipv4Part.split('.');
			if (ipv4Parts.length === 4) {
				ipv4Parts[3] = '0';
				return ipv6Prefix + ipv4Parts.join('.');
			}
			return ip;
		}

		// Pure IPv6 - mask last 80 bits (keep first 48 bits / 3 groups)
		const expanded = expandIPv6(ip);
		const groups = expanded.split(':');

		// Zero out groups 4-8 (indices 3-7)
		for (let i = 3; i < 8; i++) {
			groups[i] = '0000';
		}

		return compressIPv6(groups.join(':'));
	}

	return ip;
}

export function getIpAddress(
	req: Request | Headers,
	options: C15TOptions
): string | 'unknown' {
	const ipAddressConfig = options.advanced?.ipAddress;

	if (ipAddressConfig?.tracking !== false) {
		return 'unknown';
	}

	const ipHeaders = ipAddressConfig?.ipAddressHeaders || DEFAULT_IP_HEADERS;

	const headers = req instanceof Request ? req.headers : req;

	for (const key of ipHeaders) {
		const value = headers.get(key);
		if (value) {
			const ip = value.split(',')[0]?.trim();
			if (ip) {
				if (ipAddressConfig?.masking !== false) {
					return maskIpAddress(ip);
				}
				return ip;
			}
		}
	}

	return 'unknown';
}
