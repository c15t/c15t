import { createHostedTransport } from '@c15t/core/v3';

import type { ProviderTransportFactory } from './types';

/** Options for {@link hosted}. */
export interface HostedModeOptions {
	/** Backend URL. Can be relative or absolute. */
	url: string;
	/** Domain sent when consent is saved. */
	domain?: string;
	/** Fetch implementation used for backend requests. */
	fetch?: typeof globalThis.fetch;
	/** Headers forwarded to the backend init endpoint. */
	headers?: Record<string, string>;
}

/**
 * Selects the hosted transport for a consent provider.
 *
 * @param options - Hosted backend connection options.
 * @returns A hosted provider transport factory.
 */
export const hosted = function hosted(
	options: HostedModeOptions
): ProviderTransportFactory {
	return Object.assign(
		() =>
			createHostedTransport({
				backendURL: options.url,
				domain: options.domain,
				fetch: options.fetch,
				headers: options.headers,
			}),
		{ kind: 'hosted' as const }
	);
};
