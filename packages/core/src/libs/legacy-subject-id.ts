/**
 * The `<key>-sid` subject ID c15t 3.2 stored before any choice. Nothing
 * writes it now; startup and `clear()` remove a copy an earlier version
 * left. Its own module with no record code, so a runtime that mounts no
 * persistence can remove it without loading persistence.
 *
 * @internal
 */
import type { CookieOptions, StorageConfig } from './cookie';
import { deleteCookie, getRawCookieValue, getRootDomain } from './cookie';
import { resolveStorageKeys } from './storage-keys';

const removeLocalStorageKey = function removeLocalStorageKey(
	key: string
): void {
	try {
		window.localStorage?.removeItem(key);
	} catch {
		// Blocked storage holds nothing to remove.
	}
};

/**
 * The page's host and every parent domain of it with at least two labels,
 * as cookie domains: `a.app.example.com`, `app.example.com`, `example.com`.
 * None for `localhost` or an IP address, which take host-only cookies.
 */
const parentDomains = function parentDomains(): string[] {
	const host = window.location.hostname;
	if (!host.includes('.') || /^[\d.]+$/u.test(host) || host.includes(':')) {
		return [];
	}
	const labels = host.split('.');
	return labels.slice(0, -1).map((_, index) => labels.slice(index).join('.'));
};

/**
 * The ID a `<key>-sid` copy from c15t 3.2 holds, `null` for none: the cookie
 * copy, else the localStorage one. Only for a visitor whose stored records
 * carry no ID, such as one an older version wrote: 3.2 used this ID for
 * them, so it is kept with their records before the copy goes.
 *
 * @internal
 */
export const readLegacySubjectId = function readLegacySubjectId(
	config: StorageConfig | undefined
): string | null {
	if (typeof document === 'undefined') {
		return null;
	}
	const key = resolveStorageKeys(config).subject;
	const raw = getRawCookieValue(key);
	if (raw) {
		try {
			const decoded = decodeURIComponent(raw);
			if (decoded) {
				return decoded;
			}
		} catch {
			// Not URI-encoded as 3.2 wrote it: try the local copy.
		}
	}
	try {
		return window.localStorage?.getItem(key) || null;
	} catch {
		return null;
	}
};

/**
 * Removes the `<key>-sid` subject ID that c15t 3.2 stored on the first page
 * load, before the visitor chose anything. The ID now lives only in memory
 * until a save records it, so a copy left from an earlier version goes.
 *
 * 3.2 could leave more than one copy: its server adapters set a host-only
 * cookie unless they were given the browser's storage options, and its
 * browser runtime set one at the root domain with `crossSubdomain` or at
 * `defaultDomain`. The host-only copy and one at every parent domain of the
 * page's host are expired, at path `/`, so a `defaultDomain` the site has
 * since changed is covered too. Touches storage only when a copy is there,
 * so a start without one writes nothing.
 *
 * @internal
 */
export const removeLegacySubjectId = function removeLegacySubjectId(
	config: StorageConfig | undefined,
	cookie?: CookieOptions
): void {
	if (typeof document === 'undefined') {
		return;
	}
	const key = resolveStorageKeys(config).subject;
	try {
		if (window.localStorage?.getItem(key) !== null) {
			removeLocalStorageKey(key);
		}
	} catch {
		// Blocked storage holds nothing to remove.
	}
	if (getRawCookieValue(key) === null) {
		return;
	}
	// `''` is host-only. The scopes are expired whatever the current
	// configuration says, since the copy may predate it.
	const domains = new Set([
		'',
		getRootDomain(),
		...parentDomains(),
		config?.defaultDomain ?? '',
		cookie?.domain ?? '',
	]);
	for (const domain of domains) {
		deleteCookie(key, { crossSubdomain: false, domain, path: '/' });
	}
};
