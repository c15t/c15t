/**
 * URL / method matching utilities.
 *
 * Pure functions: no globals beyond `window.location` (consulted only
 * by `parseUrl` for relative-URL resolution). Each helper takes plain
 * data and returns a boolean / `URL`.
 */
import type { NetworkBlockerRule } from './types';

/**
 * Normalize an HTTP method to upper-case. `null`/`undefined`/empty
 * defaults to `'GET'`, matching the XHR / fetch spec defaults.
 */
export function normalizeMethod(method: string | undefined | null): string {
	if (!method) return 'GET';
	return method.toUpperCase();
}

/**
 * Best-effort URL parsing across the inputs `fetch` and XHR accept.
 *
 * Returns `null` (rather than throwing) when:
 * - input is `null`/`undefined`,
 * - input is a string and `window.location` isn't available to resolve
 *   a relative URL,
 * - the URL constructor throws (malformed inputs).
 *
 * Callers treat `null` as "let the request through" — we don't have
 * enough information to gate on it.
 */
export function parseUrl(rawUrl: string | URL | Request): URL | null {
	try {
		if (rawUrl instanceof URL) return rawUrl;
		if (typeof rawUrl === 'string') {
			if (typeof window === 'undefined') return null;
			return new URL(rawUrl, window.location?.href);
		}
		if (typeof Request !== 'undefined' && rawUrl instanceof Request) {
			return new URL(rawUrl.url);
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Match a hostname against a rule's `domain`, treating the rule as a
 * suffix match: `example.com` rule matches both `example.com` and
 * `cdn.example.com`. Case-insensitive.
 */
export function hostnameMatchesRule(
	hostname: string,
	rule: NetworkBlockerRule
): boolean {
	if (!hostname) return false;
	const ruleDomain = rule.domain.trim().toLowerCase();
	const targetHost = hostname.trim().toLowerCase();
	if (!ruleDomain || !targetHost) return false;
	if (targetHost === ruleDomain) return true;
	return targetHost.endsWith(`.${ruleDomain}`);
}

/**
 * Match a request pathname against a rule's optional `pathIncludes`
 * filter (substring match). When the rule has no `pathIncludes`, every
 * pathname matches.
 */
export function pathMatchesRule(
	pathname: string,
	rule: NetworkBlockerRule
): boolean {
	if (typeof rule.pathIncludes !== 'string') return true;
	if (!pathname) return false;
	return pathname.includes(rule.pathIncludes);
}

/**
 * Match an HTTP method against a rule's optional `methods` allow-list.
 * When the rule has no `methods`, every method matches. Comparison is
 * normalized to upper-case on both sides.
 */
export function methodMatchesRule(
	method: string,
	rule: NetworkBlockerRule
): boolean {
	if (!rule.methods || rule.methods.length === 0) return true;
	const upper = normalizeMethod(method);
	return rule.methods.some((m) => normalizeMethod(m) === upper);
}
