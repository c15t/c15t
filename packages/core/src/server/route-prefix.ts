/**
 * The one check every adapter runs on `routePrefix` when it is set up.
 * Server and build code only: browser bundles receive a prefix this has
 * already accepted.
 */

/**
 * Checks where an adapter mounts its consent route and removes its
 * trailing slashes.
 *
 * A prefix of `/` is rejected: a catch-all consent route at the site root
 * would answer every page in the app, and `${routePrefix}/init` would read
 * as `//init`, a protocol-relative URL.
 *
 * @param adapter - The package name the error starts with, such as
 * `@c15t/nextjs`.
 * @param routePrefix - The configured prefix.
 * @returns The prefix without trailing slashes, such as `/api/c15t`.
 * @throws {TypeError} When the prefix is not a string that starts with one
 * `/`, or is `/` itself.
 * @example
 * ```ts
 * normalizeRoutePrefix('@c15t/nextjs', '/api/c15t/'); // '/api/c15t'
 * normalizeRoutePrefix('@c15t/nextjs', '/'); // throws
 * ```
 */
export const normalizeRoutePrefix = function normalizeRoutePrefix(
	adapter: string,
	routePrefix: unknown
): string {
	if (typeof routePrefix !== 'string' || !routePrefix.startsWith('/')) {
		throw new TypeError(
			`${adapter}: \`routePrefix\` must be a path that starts with '/', such as '/api/c15t'. Got ${JSON.stringify(routePrefix)}.`
		);
	}
	let end = routePrefix.length;
	while (end > 0 && routePrefix[end - 1] === '/') {
		end -= 1;
	}
	const trimmed = routePrefix.slice(0, end);
	if (trimmed === '') {
		throw new TypeError(
			`${adapter}: \`routePrefix\` can't be '/': a consent route at the site root would catch every page. Use a path such as '/api/c15t'.`
		);
	}
	if (trimmed.startsWith('//')) {
		throw new TypeError(
			`${adapter}: \`routePrefix\` must be a path on this site, such as '/api/c15t'. ${JSON.stringify(routePrefix)} starts with '//', which reads as another host.`
		);
	}
	return trimmed;
};
