import { os } from '~/contracts';
import type { C15TContext } from '~/types';
import { version } from '../../version';

// Use os.meta.status.handler to connect to the contract
export const statusHandler = os.meta.status.handler(({ context }) => {
	const typedContext = context as C15TContext;

	// Extract country and region from request headers
	const headers = typedContext.headers;
	const normalizeHeader = (
		value: string | string[] | null | undefined
	): string | null => {
		if (!value) {
			return null;
		}
		return Array.isArray(value) ? (value[0] ?? null) : value;
	};

	const countryCode =
		normalizeHeader(headers?.get('cf-ipcountry')) ??
		normalizeHeader(headers?.get('x-vercel-ip-country')) ??
		normalizeHeader(headers?.get('x-amz-cf-ipcountry')) ??
		normalizeHeader(headers?.get('x-country-code'));

	const regionCode =
		normalizeHeader(headers?.get('x-vercel-ip-country-region')) ??
		normalizeHeader(headers?.get('x-region-code'));

	return {
		status: 'ok' as const,
		version,
		timestamp: new Date(),
		client: {
			ip: typedContext.ipAddress ?? null,
			userAgent: typedContext.userAgent ?? null,
			region: {
				countryCode,
				regionCode,
			},
		},
	};
});
