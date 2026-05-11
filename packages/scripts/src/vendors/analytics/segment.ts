import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

/**
 * Public Segment Analytics.js API exposed on `window.analytics`.
 *
 * Use this interface when interacting with Segment calls queued before or after
 * the client library is fully initialized.
 *
 * @example
 * ```ts
 * window.analytics.track('Signup', { plan: 'pro' });
 * ```
 */
export interface SegmentApi {
	/**
	 * Queues an event tracking call.
	 *
	 * @param event - Event name to record.
	 * @param properties - Optional event properties payload.
	 * @returns `void`.
	 *
	 * @remarks
	 * Calls are queued until Analytics.js initializes.
	 *
	 * @example
	 * ```ts
	 * window.analytics.track('Signup', { plan: 'pro' });
	 * ```
	 */
	track: (event: string, properties?: Record<string, unknown>) => void;
	/**
	 * Queues a page tracking call.
	 *
	 * @param name - Optional page name override.
	 * @param properties - Optional page metadata payload.
	 * @returns `void`.
	 *
	 * @remarks
	 * If no name is passed, Segment infers the current page context.
	 *
	 * @example
	 * ```ts
	 * window.analytics.page('Pricing');
	 * ```
	 */
	page: (name?: string, properties?: Record<string, unknown>) => void;
	/**
	 * Queues a user identification call.
	 *
	 * @param userId - Stable user identifier.
	 * @param traits - Optional trait map associated with the user.
	 * @param options - Optional Segment call options.
	 * @returns `void`.
	 *
	 * @remarks
	 * Ensure the client is initialized and use a stable `userId` to avoid
	 * fragmented user profiles.
	 *
	 * @example
	 * ```ts
	 * window.analytics.identify('user_123', { email: 'dev@example.com' });
	 * ```
	 */
	identify: (
		userId: string,
		traits?: Record<string, unknown>,
		options?: Record<string, unknown>
	) => void;
	/**
	 * Queues a group association call for account-level analytics.
	 *
	 * @param groupId - Group or account identifier.
	 * @param traits - Optional group trait map.
	 * @param options - Optional Segment call options.
	 * @returns `void`.
	 *
	 * @example
	 * ```ts
	 * window.analytics.group('acme-inc', { plan: 'enterprise' });
	 * ```
	 */
	group: (
		groupId: string,
		traits?: Record<string, unknown>,
		options?: Record<string, unknown>
	) => void;
	/**
	 * Queues a user alias call to merge identities.
	 *
	 * @param userId - New canonical user identifier.
	 * @param previousId - Optional previous anonymous or legacy identifier.
	 * @param options - Optional Segment call options.
	 * @returns `void`.
	 *
	 * @remarks
	 * Use `previousId` only when linking an existing anonymous identity to the
	 * new `userId`.
	 *
	 * @example
	 * ```ts
	 * window.analytics.alias('user_123', 'anon_456');
	 * ```
	 */
	alias: (
		userId: string,
		previousId?: string,
		options?: Record<string, unknown>
	) => void;
	/**
	 * Queues a reset call that clears current user identity state.
	 *
	 * @returns `void`.
	 *
	 * @example
	 * ```ts
	 * window.analytics.reset();
	 * ```
	 */
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
	let manifest: VendorManifest = segmentManifest;

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
