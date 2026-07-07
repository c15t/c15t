/**
 * @packageDocumentation
 * Pure logic for clearing first-party cookies and Web Storage keys when a
 * consent category is not granted.
 */

import type { AllConsentNames } from '../../types/consent-types';
import { getRootDomain } from '../cookie/domain-utils';
import { deleteCookie } from '../cookie/operations';
import type {
	ClearOnRevocationConfig,
	ClearOnRevocationCookieTarget,
	ClearOnRevocationTargets,
} from './types';

/**
 * Matches a name against an exact string or a `prefix*` pattern.
 *
 * @internal
 */
export function matchesPattern(name: string, pattern: string): boolean {
	if (pattern.endsWith('*')) {
		return name.startsWith(pattern.slice(0, -1));
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
 * `path` (if any) alongside it.
 *
 * @internal
 */
function resolveMatchingTargets(
	entries: (string | ClearOnRevocationCookieTarget)[],
	liveNames: string[]
): ClearOnRevocationCookieTarget[] {
	const matched: ClearOnRevocationCookieTarget[] = [];
	const seen = new Set<string>();

	for (const entry of entries) {
		const { name: pattern, path } =
			typeof entry === 'string' ? { name: entry, path: undefined } : entry;

		const names = pattern.endsWith('*')
			? liveNames.filter((liveName) => matchesPattern(liveName, pattern))
			: [pattern];

		for (const name of names) {
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
	liveNames: string[]
): string[] {
	return resolveMatchingTargets(patterns, liveNames).map(
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

	if (targets.localStorage && targets.localStorage.length > 0) {
		for (const key of resolveMatchingNames(
			targets.localStorage,
			listStorageKeys(window.localStorage)
		)) {
			window.localStorage.removeItem(key);
		}
	}

	if (targets.sessionStorage && targets.sessionStorage.length > 0) {
		for (const key of resolveMatchingNames(
			targets.sessionStorage,
			listStorageKeys(window.sessionStorage)
		)) {
			window.sessionStorage.removeItem(key);
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
