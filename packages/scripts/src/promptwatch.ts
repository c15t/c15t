import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

/**
 * Promptwatch vendor manifest.
 *
 * Loads the Promptwatch client with your project id on the script element.
 *
 * @see {@link https://promptwatch.com} Promptwatch
 */
export const promptwatchManifest = {
	...vendorManifestContract,
	vendor: 'promptwatch',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
			attributes: {
				'data-project-id': '{{projectId}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface PromptwatchOptions {
	/**
	 * Your Promptwatch project id (UUID from the Promptwatch dashboard).
	 */
	projectId: string;

	/**
	 * Promptwatch client script URL.
	 * @default 'https://ingest.promptwatch.com/js/client.min.js'
	 */
	scriptSrc?: string;
}

/**
 * Promptwatch analytics script for AI traffic and usage insights.
 *
 * @param options - The options for the Promptwatch script
 * @returns The Promptwatch script configuration
 *
 * @example
 * ```ts
 * const promptwatchScript = promptwatch({
 *   projectId: '7d60345b-27bb-4779-a385-d4fc19ce732c',
 * });
 * ```
 */
export function promptwatch({
	projectId,
	scriptSrc,
}: PromptwatchOptions): Script {
	const resolved = resolveManifest(promptwatchManifest, {
		projectId,
		scriptSrc: scriptSrc ?? 'https://ingest.promptwatch.com/js/client.min.js',
	});

	return resolved;
}
