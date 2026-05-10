import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

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
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface SegmentOptions {
	/**
	 * Your Segment write key.
	 * @example `abc123xyz456`
	 */
	writeKey: string;

	/**
	 * Queue the initial `analytics.page()` call during setup.
	 * @default true
	 */
	trackPageView?: boolean;

	/**
	 * Optional full loader URL override.
	 *
	 * This helper intentionally targets the default `window.analytics` global.
	 * Alternate global keys from the upstream registry helper are not supported here.
	 */
	scriptSrc?: string;
}

/**
 * Creates a Segment Analytics.js script.
 *
 * @param options - The options for the Segment script
 * @returns The Segment script configuration
 *
 * @example
 * ```ts
 * const segmentScript = segment({
 *   writeKey: 'abc123xyz456',
 * });
 * ```
 *
 * @see {@link https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/} Segment Analytics.js documentation
 */
export function segment({
	writeKey,
	trackPageView = true,
	scriptSrc,
}: SegmentOptions): Script {
	const manifest = trackPageView
		? segmentManifest
		: ({
				...segmentManifest,
				install: segmentManifest.install.filter(
					(step) =>
						!(
							step.type === 'callGlobal' &&
							step.global === 'analytics' &&
							step.method === 'page'
						)
				),
			} as const satisfies VendorManifest);

	const resolved = resolveManifest(manifest, {
		scriptSrc:
			scriptSrc ??
			`https://cdn.segment.com/analytics.js/v1/${writeKey}/analytics.min.js`,
	});

	return resolved;
}
