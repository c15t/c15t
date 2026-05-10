import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		YT?: {
			Player?: new (
				element: string | HTMLElement,
				options?: Record<string, unknown>
			) => unknown;
		};
		onYouTubeIframeAPIReady?: (() => void) & {
			q?: unknown[][];
		};
	}
}

/**
 * YouTube Player vendor manifest.
 *
 * The bootstrap step defines a harmless top-level callback stub so the iframe
 * API can signal readiness even before application code replaces it.
 */
export const youtubePlayerManifest = {
	...vendorManifestContract,
	vendor: 'youtube-player',
	category: 'functionality',
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'onYouTubeIframeAPIReady',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface YouTubePlayerOptions {
	/** Full YouTube iframe API loader URL override. */
	scriptSrc?: string;
}

/**
 * Creates a YouTube Player script.
 *
 * This helper loads the iframe API only. Promise-based readiness wrappers must
 * be handled in application code.
 *
 * @param options - Optional configuration for the YouTube Player script
 * @returns The YouTube Player script configuration
 */
export function youtubePlayer(options: YouTubePlayerOptions = {}): Script {
	let resolvedScriptSrc = options.scriptSrc;

	if (!resolvedScriptSrc) {
		resolvedScriptSrc = 'https://www.youtube.com/iframe_api';
	}

	const resolved = resolveManifest(youtubePlayerManifest, {
		scriptSrc: resolvedScriptSrc,
	});

	return resolved;
}
