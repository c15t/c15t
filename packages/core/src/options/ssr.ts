import type { InitOutput } from '@c15t/schema/types';

import type { GlobalVendorList } from '../types';

/**
 * Request context captured alongside server-fetched init data so the
 * client can decide whether the payload still matches the live request.
 */
export interface SSRInitRequestContext {
	backendURL: string;
	country: string | null;
	region: string | null;
	language: string | null;
	gpc: boolean;
	credentials?: RequestCredentials;
}

/**
 * Metadata describing how server-side init data was obtained.
 */
export interface SSRInitRequestMetadata {
	requestContext?: SSRInitRequestContext;
	requestDurationMs?: number;
	cache?: {
		isHit: boolean;
		detail: string | null;
	};
}

/**
 * Why server-side init data was not applied on the client.
 */
export type SSRSkippedReason =
	| 'no_data'
	| 'fetch_failed'
	| 'context_mismatch'
	| null;

/**
 * Init data fetched on the server and handed to the client provider.
 */
export interface SSRInitialData {
	init: InitOutput | undefined;
	gvl?: GlobalVendorList | null;
	metadata?: SSRInitRequestMetadata;
}
