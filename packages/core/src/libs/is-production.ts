// Typed here so core needs no Node types. TypeScript erases it, leaving the
// expression bundlers look for.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Whether this is a production build, for gating development warnings.
 *
 * Bundlers replace the literal `process.env.NODE_ENV` at build time, the
 * same check `@c15t/react` uses, so a production build skips the warnings
 * even in the browser, which has no `process`. Reading it through
 * `globalThis.process` hides it from that replacement and the warnings
 * print in production. Without a bundler and without `process`, such as an
 * ES module loaded straight from a CDN, the read throws and counts as
 * development.
 *
 * @internal
 * @returns `true` when `NODE_ENV` is `'production'`.
 */
export const isProductionBuild = function isProductionBuild(): boolean {
	try {
		return process.env.NODE_ENV === 'production';
	} catch {
		return false;
	}
};
