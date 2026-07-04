export interface ReadInitialConsentConfigOptions {
	headers: Headers;
	cookieHeader?: string | null;
	cookieName?: string;
	country?: string;
	region?: string;
	language?: string;
}

export interface PrefetchInitialConsentOptions
	extends ReadInitialConsentConfigOptions {
	backendURL: string;
	fetch?: typeof globalThis.fetch;
	forwardHeaders?: string[];
}
