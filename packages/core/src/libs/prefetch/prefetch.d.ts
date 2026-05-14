import type { SSRInitialData } from '../../store/type';
import type { PrefetchOptions } from './types';
type PrefetchPromise = Promise<SSRInitialData | undefined>;
export declare function getMatchingPrefetchedInitialData(options: {
	backendURL: string;
	overrides?: PrefetchOptions['overrides'];
	credentials?: RequestCredentials;
}): PrefetchPromise | undefined;
/**
 * Generates a self-contained inline script that starts the `/init`
 * prefetch before framework hydration.
 *
 * @remarks
 * The returned string is safe for inline `<script>` injection — all
 * `<` characters are escaped to `\u003c` to prevent XSS via
 * `</script>` breakout.
 *
 * Framework adapters should inject this script as early as possible
 * (e.g. `beforeInteractive` in Next.js, `<script>` in `<head>` for
 * vanilla HTML).
 */
export declare function buildPrefetchScript(options: PrefetchOptions): string;
export declare function primePrefetchedInitialData(
	options: PrefetchOptions
): PrefetchPromise | undefined;
export {};
