export interface ReadInitialConsentConfigOptions {
	headers: Headers;
	cookieHeader?: string | null;
	/**
	 * Cookie name holding persisted consent. Defaults to `c15t` — the
	 * persistence module's storage key. Set this only if you customized
	 * `storageConfig.storageKey` client-side; it must match.
	 */
	cookieName?: string;
	country?: string;
	region?: string;
	language?: string;
}

export interface PrefetchInitialConsentOptions extends ReadInitialConsentConfigOptions {
	backendURL: string;
	fetch?: typeof globalThis.fetch;
	forwardHeaders?: string[];
}
