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
const SCHEME_REGEX = /^(?<scheme>[a-z][a-z\d+.-]*):\/\//iu;

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
export const getAppScheme = function getAppScheme(
	value: string
): string | undefined {
	const match = SCHEME_REGEX.exec(value.trim());
	const scheme = match?.groups?.scheme;
	if (!scheme) {
		return undefined;
	}

	const normalized = `${scheme.toLowerCase()}:`;
	return WEB_SCHEMES.has(normalized) ? undefined : normalized;
};
