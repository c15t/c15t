import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

export interface SegmentApi {
	track: (event: string, properties?: Record<string, unknown>) => void;
	page: (name?: string, properties?: Record<string, unknown>) => void;
	identify: (
		userId: string,
		traits?: Record<string, unknown>,
		options?: Record<string, unknown>
	) => void;
	group: (
		groupId: string,
		traits?: Record<string, unknown>,
		options?: Record<string, unknown>
	) => void;
	alias: (
		userId: string,
		previousId?: string,
		options?: Record<string, unknown>
	) => void;
	reset: () => void;
}

declare global {
	interface Window {
		analytics: SegmentApi;
	}
}

/**
 * Segment vendor manifest.
 *
 * Uses Segment's standard `window.analytics` queue shape and optionally queues
 * the initial `page()` call before the bundle loads.
 */
export const segmentManifest = {
	...vendorManifestContract,
	vendor: 'segment',
	category: 'measurement',
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'analytics',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'defineQueueMethods',
			target: 'analytics',
			methods: ['track', 'page', 'identify', 'group', 'alias', 'reset'],
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'analytics',
			method: 'page',
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface SegmentOptions {
	/** Your Segment write key. */
	writeKey: string;
	/** Queue the initial `analytics.page()` call during setup. */
	trackPageView?: boolean;
	/** Optional full loader URL override. */
	scriptUrl?: string;
}

/**
 * Creates a Segment Analytics.js script.
 *
 * @param options - The options for the Segment script.
 * @returns The Segment script configuration.
 */
export function segment({
	writeKey,
	trackPageView = true,
	scriptUrl,
}: SegmentOptions): Script {
	let manifest = segmentManifest;

	if (!trackPageView) {
		manifest = {
			...segmentManifest,
			install: segmentManifest.install.filter(
				(step) =>
					!(
						step.type === 'callGlobal' &&
						step.global === 'analytics' &&
						step.method === 'page'
					)
			),
		} as const satisfies VendorManifest;
	}

	return resolveManifest(manifest, {
		scriptUrl:
			scriptUrl ??
			`https://cdn.segment.com/analytics.js/v1/${writeKey}/analytics.min.js`,
	});
}
