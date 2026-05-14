import type { SSRInitRequestContext } from '../store/type';
import type { Overrides } from '../types';
export declare function buildRequestContextHeaders(
	overrides?: Pick<Overrides, 'country' | 'region' | 'language'>
): Record<string, string>;
export declare function canonicalizeBrowserBackendURL(
	backendURL: string
): string | undefined;
export interface RuntimeRequestContextMatcher {
	backendURL: string;
	country?: string;
	region?: string;
	language?: string;
	gpc: boolean;
	credentials: RequestCredentials;
}
export declare function createBrowserRequestContext(options: {
	backendURL: string;
	overrides?: Pick<Overrides, 'country' | 'region' | 'language'>;
	credentials?: RequestCredentials;
	gpc?: boolean;
}): SSRInitRequestContext | undefined;
export declare function createRuntimeRequestContextMatcher(options: {
	backendURL: string;
	overrides?: Overrides;
	credentials?: RequestCredentials;
}): RuntimeRequestContextMatcher | undefined;
export declare function matchesStoredRequestContext(
	stored: SSRInitRequestContext,
	matcher: RuntimeRequestContextMatcher
): boolean;
