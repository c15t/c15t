/**
 * Content Security Policy source hashes, computed the way a browser checks
 * an inline element.
 *
 * Shared by the config-time hashes in `csp.ts` and the browser's check of
 * `clientEntrypoint` scripts, so both produce the same string.
 *
 * @internal
 */

/** A hash algorithm Astro's CSP feature accepts. */
export type CspHashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

/** A hash source in the `sha256-…` form a CSP directive takes. */
export type CspHashSource = `sha${number}-${string}`;

const PREFIXES = {
	'SHA-256': 'sha256-',
	'SHA-384': 'sha384-',
	'SHA-512': 'sha512-',
} as const satisfies Record<CspHashAlgorithm, string>;

/**
 * Hash one inline element's text the way a browser checks it.
 *
 * @param content - The element's exact text content.
 * @param algorithm - The digest to use.
 * @returns The hash source, such as `sha256-…`.
 */
export const hashSource = async function hashSource(
	content: string,
	algorithm: CspHashAlgorithm
): Promise<CspHashSource> {
	const digest = await globalThis.crypto.subtle.digest(
		algorithm,
		new TextEncoder().encode(content)
	);
	let binary = '';
	for (const byte of new Uint8Array(digest)) {
		binary += String.fromCharCode(byte);
	}
	return `${PREFIXES[algorithm]}${btoa(binary)}` as CspHashSource;
};
