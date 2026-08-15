/**
 * Helpers for recognising non-web ("app") origin schemes such as the
 * `capacitor://localhost` origin an iOS Capacitor WebView sends.
 *
 * @packageDocumentation
 */

/**
 * Schemes browsers treat as ordinary web origins.
 *
 * Trusted-origin entries using one of these (or no scheme at all) stay
 * protocol-agnostic, which is the behaviour c15t has always had. Any other
 * scheme is treated as an app scheme and must match exactly.
 */
const WEB_SCHEMES = new Set(['http:', 'https:', 'ws:', 'wss:']);

/** Matches a URL scheme prefix (e.g. `https://`, `capacitor://`). */
const SCHEME_REGEX = /^([a-z][a-z\d+.-]*):\/\//i;

/**
 * Extracts a non-web scheme from an origin or trusted-origin entry.
 *
 * Native WebView shells serve the app from a custom scheme rather than
 * `http(s)`, so `capacitor://localhost` and `https://localhost` are distinct
 * origins that must not be conflated. iOS Capacitor defaults to `capacitor:`,
 * apps migrated from `cordova-plugin-ionic-webview` use `ionic:`, and
 * `iosScheme` may set any custom value. Android serves from `http://localhost`
 * and is therefore unaffected.
 *
 * @param value - An origin or trusted-origin entry
 * @returns The lowercased scheme including the trailing colon (e.g.
 * `capacitor:`), or `undefined` for web schemes and bare hostnames
 *
 * @example
 * ```ts
 * getAppScheme('capacitor://localhost'); // 'capacitor:'
 * getAppScheme('https://example.com');   // undefined
 * getAppScheme('example.com');           // undefined
 * ```
 *
 * @internal
 */
export function getAppScheme(value: string): string | undefined {
	const match = value.trim().match(SCHEME_REGEX);
	if (!match?.[1]) {
		return undefined;
	}

	const scheme = `${match[1].toLowerCase()}:`;
	return WEB_SCHEMES.has(scheme) ? undefined : scheme;
}

/**
 * Splits an app-scheme origin into its scheme and authority.
 *
 * `URL` reports `null` for the `origin` of a non-special scheme, so the
 * authority is read from the raw string instead of a parsed URL.
 *
 * @param value - An origin or trusted-origin entry known to carry an app scheme
 * @param scheme - The scheme returned by {@link getAppScheme}
 * @returns The scheme and lowercased authority (host and optional port), or
 * `null` when no authority is present
 *
 * @internal
 */
export function splitAppSchemeOrigin(
	value: string,
	scheme: string
): { scheme: string; authority: string } | null {
	const withoutScheme = value.trim().slice(scheme.length + 2);
	// The authority ends at the first path, query, or fragment marker.
	const authority = withoutScheme.split(/[/?#]/)[0]?.toLowerCase();

	if (!authority) {
		return null;
	}

	return { scheme, authority };
}
