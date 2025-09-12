import {
	metaPixel as coreMetaPixel,
	type MetaPixelOptions,
} from 'c15t/scripts/meta-pixel';

import type { ScriptConfig } from '../components/script-loader/script-loader';

export type { MetaPixelOptions };

/**
 * Creates a Meta Pixel script with inline JavaScript code.
 *
 * This script uses textContent to inject the Meta Pixel tracking code directly
 * into the page, which is the recommended approach for Meta Pixel implementation.
 *
 * @param options - The options for the Meta Pixel script
 * @returns The Meta Pixel script configuration
 *
 * @example
 * ```ts
 * const metaPixelScript = metaPixel({
 *   pixelId: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://developers.facebook.com/docs/meta-pixel/get-started} Meta Pixel documentation
 */
export function metaPixel(options: MetaPixelOptions): ScriptConfig {
	return {
		...coreMetaPixel(options),
		type: 'script',
	};
}
