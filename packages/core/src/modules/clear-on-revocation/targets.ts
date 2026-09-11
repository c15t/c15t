import type {
	ClearOnRevocationCookie,
	ClearOnRevocationTargets,
} from './types';

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~\dA-Za-z]+$/u;
const COOKIE_DOMAIN = /^\.?[\dA-Za-z.-]+$/u;
// oxlint-disable-next-line no-control-regex -- Reject cookie attribute injection through control characters.
const COOKIE_PATH = /^\/[^;\u0000-\u001f\u007f]*$/u;

const validPattern = (pattern: string): boolean =>
	pattern.length > 0 &&
	(!pattern.includes('*') ||
		(pattern.length > 1 && pattern.indexOf('*') === pattern.length - 1));

const matches = (name: string, pattern: string): boolean =>
	pattern.endsWith('*')
		? name.startsWith(pattern.slice(0, -1))
		: name === pattern;

const cookiePaths = (): string[] => {
	const paths = new Set(['/']);
	const { pathname } = window.location;
	for (let index = 1; index <= pathname.length; index += 1) {
		if (index === pathname.length || pathname[index] === '/') {
			paths.add(pathname.slice(0, index));
			paths.add(`${pathname.slice(0, index)}/`);
		}
	}
	return [...paths].filter((path) => COOKIE_PATH.test(path));
};

const cookieDomains = (): string[] => {
	const domains = [''];
	const { hostname } = window.location;
	if (!COOKIE_DOMAIN.test(hostname)) {
		return domains;
	}
	const parts = hostname.split('.');
	for (let index = 0; index < parts.length; index += 1) {
		domains.push(parts.slice(index).join('.'));
	}
	return domains;
};

const visibleCookieNames = (): string[] => {
	try {
		return document.cookie.split(';').flatMap((cookie) => {
			const separator = cookie.indexOf('=');
			return separator < 0 ? [] : [cookie.slice(0, separator).trim()];
		});
	} catch {
		return [];
	}
};

const validCookieTarget = ({
	name,
	domain,
	path,
}: ClearOnRevocationCookie): boolean =>
	validPattern(name) &&
	COOKIE_NAME.test(name) &&
	(domain === undefined || domain === '' || COOKIE_DOMAIN.test(domain)) &&
	(path === undefined || COOKIE_PATH.test(path));

const clearCookie = (
	target: string | ClearOnRevocationCookie,
	protectedKeys: ReadonlySet<string>
): void => {
	const { name, domain, path, partitioned } =
		typeof target === 'string' ? { name: target } : target;
	if (!validCookieTarget({ domain, name, path })) {
		return;
	}
	const names = name.endsWith('*') ? visibleCookieNames() : [name];
	const domains = domain === undefined ? cookieDomains() : [domain];
	const paths = path === undefined ? cookiePaths() : [path];
	const secure =
		partitioned || window.location.protocol === 'https:' ? '; Secure' : '';
	// Cross-site frames reject even expired cookie writes without SameSite=None.
	const partition = partitioned ? '; SameSite=None; Partitioned' : '';
	for (const candidate of new Set(names)) {
		if (
			!COOKIE_NAME.test(candidate) ||
			protectedKeys.has(candidate) ||
			!matches(candidate, name)
		) {
			continue;
		}
		for (const candidateDomain of domains) {
			for (const candidatePath of paths) {
				try {
					const domainAttribute = candidateDomain
						? `; Domain=${candidateDomain}`
						: '';
					document.cookie = `${candidate}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${candidatePath}${domainAttribute}${secure}${partition}`;
				} catch {
					// A browser may reject one scope while permitting another.
				}
			}
		}
	}
};

const clearStorage = (
	kind: 'localStorage' | 'sessionStorage',
	patterns: readonly string[],
	protectedKeys: ReadonlySet<string>
): void => {
	let storage: Storage;
	try {
		storage = window[kind];
	} catch {
		return;
	}
	for (const pattern of patterns) {
		if (!validPattern(pattern)) {
			continue;
		}
		const keys: string[] = [];
		if (pattern.endsWith('*')) {
			try {
				// Snapshot names before removal so shifting indexes cannot skip keys.
				for (let index = 0; index < storage.length; index += 1) {
					try {
						const key = storage.key(index);
						if (key !== null && matches(key, pattern)) {
							keys.push(key);
						}
					} catch {
						// Continue with the remaining readable keys.
					}
				}
			} catch {
				// Exact targets remain usable when enumeration is unavailable.
			}
		} else {
			keys.push(pattern);
		}
		for (const key of keys) {
			if (!protectedKeys.has(key)) {
				try {
					storage.removeItem(key);
				} catch {
					// One blocked entry must not prevent other cleanup.
				}
			}
		}
	}
};

/**
 * Remove only the configured browser data, preserving consent records.
 * @internal
 */
export const clearTargets = (
	targets: ClearOnRevocationTargets,
	protectedKeys: ReadonlySet<string>
): void => {
	for (const cookie of targets.cookies ?? []) {
		clearCookie(cookie, protectedKeys);
	}
	if (targets.localStorage?.length) {
		clearStorage('localStorage', targets.localStorage, protectedKeys);
	}
	if (targets.sessionStorage?.length) {
		clearStorage('sessionStorage', targets.sessionStorage, protectedKeys);
	}
};
