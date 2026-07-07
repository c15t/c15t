/**
 * @packageDocumentation
 * Pure logic for clearing first-party cookies and Web Storage keys when a
 * consent category is not granted.
 */

import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../store/initial-state';
import type { AllConsentNames } from '../../types/consent-types';
import { getRootDomain } from '../cookie/domain-utils';
import { deleteCookie } from '../cookie/operations';
import { PENDING_CONSENT_SYNC_KEY } from '../save-consents';
import type {
	ClearOnRevocationConfig,
	ClearOnRevocationCookieTarget,
	ClearOnRevocationTargets,
} from './types';

/**
 * Cookie/storage names that must never be deleted by `clearOnRevocation`,
 * even if a user misconfigures a wildcard.  Prevents self-inflicted consent
 * state corruption.
 *
 * @internal
 */
const DENYLISTED_NAMES: Set<string> = new Set([
	STORAGE_KEY,
	STORAGE_KEY_V2,
	PENDING_CONSENT_SYNC_KEY,
]);

/**
 * Checks whether a name is denylisted.  Exact matches and wildcard-overlap
 * (e.g. `c15t*` matching `c15t`) are both caught.
 *
 * @internal
 */
function isDenylisted(name: string): boolean {
	if (DENYLISTED_NAMES.has(name)) {
		return true;
	}

	// Check wildcard overlap: if any denylisted name starts with the
	// candidate name, a wildcard like `c15t*` would match it.
	for (const deny of DENYLISTED_NAMES) {
		if (deny.startsWith(name) && name.length > 0) {
			return true;
		}
	}

	return false;
}

/**
 * Validates a cookie/storage name before deletion.
 *
 * Rejects names containing characters that can inject extra cookie
 * attributes (`;`, `=`) or control characters (`\r`, `\n`, and below).
 * Also rejects a bare `'*'` pattern which would match every name.
 *
 * @returns `true` if the name is safe to use in a deletion write.
 *
 * @internal
 */
function isValidName(name: string): boolean {
	if (name === '*') {
		return false;
	}

	// Reject control characters, semicolons, equals signs, and whitespace.
	// Cookie names must be printable ASCII without injection characters.
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i);
		// Allow: ! (33), #-$ (35-36), &(38), '(39), *+ (42-43),
		// +-./ (45-46), 0-9 (48-57), A-Z (65-90), ^-_ (94-95),
		// a-z (97-122), {|} (123-125), ~ (126)
		// Reject: space (32), "(34), %(37), +(43 already OK), ,(44),
		// ;(59), =(61), @(64), [(91), \(92), ](93), _(95 already OK),
		// `(96), {(123 already OK)
		if (
			code < 33 ||
			code === 34 || // "
			code === 37 || // %
			code === 44 || // ,
			code === 59 || // ;
			code === 61 || // =
			code === 64 || // @
			code === 91 || // [
			code === 92 || // \
			code === 93 || // ]
			code === 96 || // `
			code === 127 // DEL
		) {
			return false;
		}
	}

	return true;
}

/**
 * Matches a name against an exact string or a `prefix*` pattern.
 *
 * @internal
 */
export function matchesPattern(name: string, pattern: string): boolean {
	if (pattern.endsWith('*')) {
		const prefix = pattern.slice(0, -1);

		// A bare '*' is rejected by isValidName before this function
		// is called, but guard here too for safety.
		if (prefix.length === 0) {
			return false;
		}

		return name.startsWith(prefix);
	}

	return name === pattern;
}

function listCookieNames(): string[] {
	if (typeof document === 'undefined' || !document.cookie) {
		return [];
	}

	return document.cookie
		.split(';')
		.map((pair) => pair.split('=')[0]?.trim())
		.filter((name): name is string => Boolean(name));
}

function listStorageKeys(storage: Storage): string[] {
	const keys: string[] = [];

	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);

		if (key !== null) {
			keys.push(key);
		}
	}

	return keys;
}

/**
 * Resolves plain names, `prefix*` patterns, or `{ name, path }` objects
 * against the live cookie/storage names, keeping each match's configured
 * `path` (if any) alongside it.  Skips denylisted names and invalid
 * patterns.
 *
 * @internal
 */
function resolveMatchingTargets(
	entries: (string | ClearOnRevocationCookieTarget)[],
	liveNames: string[],
	isStorage = false
): ClearOnRevocationCookieTarget[] {
	const matched: ClearOnRevocationCookieTarget[] = [];
	const seen = new Set<string>();

	for (const entry of entries) {
		const { name: pattern, path } =
			typeof entry === 'string' ? { name: entry, path: undefined } : entry;

		// Validate the pattern itself before using it.
		if (!isValidName(pattern)) {
			continue;
		}

		const names = pattern.endsWith('*')
			? liveNames.filter((liveName) => matchesPattern(liveName, pattern))
			: [pattern];

		for (const name of names) {
			// Skip denylisted names.
			if (isDenylisted(name)) {
				continue;
			}

			// For storage, validate each resolved name too.
			if (isStorage && !isValidName(name)) {
				continue;
			}

			const key = `${name} ${path ?? ''}`;

			if (!seen.has(key)) {
				seen.add(key);
				matched.push({ name, path });
			}
		}
	}

	return matched;
}

function resolveMatchingNames(
	patterns: string[],
	liveNames: string[],
	isStorage = false
): string[] {
	return resolveMatchingTargets(patterns, liveNames, isStorage).map(
		(target) => target.name
	);
}

/**
 * Deletes the cookies and Web Storage keys configured for a single consent
 * category.
 *
 * @remarks
 * Cookies are deleted via {@link deleteCookie}, which only affects
 * JavaScript-writable cookies - a same-named `HttpOnly` cookie set by a
 * server response is left untouched, matching the platform's own security
 * boundary rather than working around it.
 *
 * A browser only deletes a cookie when the delete write's `Domain` and
 * `Path` match the ones it was set with. Tracking scripts (e.g. GA4's
 * `cookie_domain: 'auto'`) commonly set cookies on the root domain
 * (`.example.com`) rather than host-only, so each name is deleted twice:
 * once host-only, once against {@link getRootDomain}. `Path` defaults to
 * `/` and has no discoverable fallback - pass `{ name, path }` for a
 * cookie set on a sub-path.
 *
 * @internal
 */
export function clearTargetsForCategory(
	targets: ClearOnRevocationTargets
): void {
	// Cookie deletion — always safe (document.cookie is same-origin).
	if (targets.cookies && targets.cookies.length > 0) {
		const rootDomain = getRootDomain();

		for (const { name, path } of resolveMatchingTargets(
			targets.cookies,
			listCookieNames()
		)) {
			if (path) {
				deleteCookie(name, { path });
			} else {
				deleteCookie(name);
			}

			if (rootDomain) {
				deleteCookie(name, { ...(path ? { path } : {}), domain: rootDomain });
			}
		}
	}

	if (typeof window === 'undefined') {
		return;
	}

	// localStorage — wrapped in try/catch because it throws SecurityError
	// in cross-origin iframes, sandboxed environments, and some private
	// browsing modes.
	if (targets.localStorage && targets.localStorage.length > 0) {
		try {
			for (const key of resolveMatchingNames(
				targets.localStorage,
				listStorageKeys(window.localStorage),
				true
			)) {
				window.localStorage.removeItem(key);
			}
		} catch {
			// localStorage unavailable — skip, don't abort sessionStorage.
		}
	}

	// sessionStorage — same guard.
	if (targets.sessionStorage && targets.sessionStorage.length > 0) {
		try {
			for (const key of resolveMatchingNames(
				targets.sessionStorage,
				listStorageKeys(window.sessionStorage),
				true
			)) {
				window.sessionStorage.removeItem(key);
			}
		} catch {
			// sessionStorage unavailable.
		}
	}
}

/**
 * Runs cookie/storage clearing for every denied category that has a
 * matching entry in `config`.
 *
 * @internal
 */
export function runClearOnRevocation(
	config: ClearOnRevocationConfig | undefined,
	deniedCategories: AllConsentNames[]
): void {
	if (!config) {
		return;
	}

	for (const category of deniedCategories) {
		const targets = config[category];

		if (targets) {
			clearTargetsForCategory(targets);
		}
	}
}
