import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';

declare global {
	interface Window {
		mixpanel?: {
			init: (token: string, config?: Record<string, unknown>) => void;
			track: (event: string, properties?: Record<string, unknown>) => void;
			identify: (distinctId: string) => void;
			reset: () => void;
			register: (properties: Record<string, unknown>) => void;
			opt_in_tracking: () => void;
			opt_out_tracking: () => void;
			/** Snippet version marker consumed by `init_from_snippet`. */
			__SV?: number;
			/** Pending `[token, config, instanceName]` init tuples consumed at SDK load. */
			_i?: unknown[][];
		};
	}
}

/**
 * Mixpanel vendor manifest.
 *
 * Implements the official snippet contract: the stub array carries the
 * snippet version marker (`__SV`) and the pending `[token, config, 'mixpanel']`
 * init tuple in `_i`, which `mixpanel-2-latest.min.js` consumes at load time via
 * `init_from_snippet`. Without `__SV` the SDK logs "Mixpanel error: Version
 * mismatch" and never initializes, silently dropping queued calls.
 *
 * Mixpanel can stay loaded across consent changes and toggle tracking with its
 * own opt-in and opt-out APIs.
 */
export const mixpanelAnalyticsManifest = {
	...vendorManifestContract,
	alwaysLoad: true,
	category: 'measurement',
	install: [
		{
			ifUndefined: true,

			name: 'mixpanel',
			type: 'setGlobal',
			value: [],
		},
		{
			path: ['mixpanel', '__SV'],
			type: 'setGlobalPath',
			value: 1.2,
		},
		{
			path: ['mixpanel', '_i'],
			// The official snippet always pushes an explicit instance name; the
			// SDK's create_mplib resolves the queue stub through that name, so a
			// two-element tuple would leave the queue unreplayed.
			type: 'setGlobalPath',
			value: [['{{token}}', '{{initOptions}}', 'mixpanel']],
		},
		{
			methods: [
				'track',
				'identify',
				'reset',
				'register',
				'opt_in_tracking',
				'opt_out_tracking',
			],

			target: 'mixpanel',
			type: 'defineQueueMethods',
		},
		{
			async: true,

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	onConsentDenied: [
		{
			global: 'mixpanel',
			method: 'opt_out_tracking',

			type: 'callGlobal',
		},
	],
	onConsentGranted: [
		{
			global: 'mixpanel',
			method: 'opt_in_tracking',

			type: 'callGlobal',
		},
	],
	onLoadDenied: [
		{
			global: 'mixpanel',
			method: 'opt_out_tracking',

			type: 'callGlobal',
		},
	],
	onLoadGranted: [
		{
			global: 'mixpanel',
			method: 'opt_in_tracking',

			type: 'callGlobal',
		},
	],
	vendor: 'mixpanel-analytics',
} as const satisfies VendorManifest;

export interface MixpanelAnalyticsOptions {
	/** Your Mixpanel project token. */
	token: string;
	/**
	 * Mixpanel init options passed after the library loads.
	 *
	 * The manifest engine serializes this object as a template variable, so use
	 * JSON-serializable values only (no functions, class instances, prototypes,
	 * `Map`, `Set`, or other non-JSON types). Named instances and nested
	 * `people.*` queue helpers are intentionally out of scope for this helper.
	 */
	initOptions?: Record<string, unknown>;
	/** Mixpanel loader URL. */
	scriptUrl?: string;
}

/**
 * Creates a Mixpanel Analytics script.
 *
 * @param options - The options for the Mixpanel Analytics script.
 * @returns The Mixpanel Analytics script configuration.
 * @throws {Error} Throws when `token` is not a non-empty 32-character
 * hexadecimal Mixpanel project token.
 *
 * @example
 * ```ts
 * import { mixpanelAnalytics } from '@c15t/scripts/mixpanel-analytics';
 *
 * const script = mixpanelAnalytics({
 * 	token: '1234567890abcdef1234567890abcdef',
 * 	initOptions: { debug: true },
 * });
 * ```
 */
export const mixpanelAnalytics = function mixpanelAnalytics({
	token,
	initOptions,
	scriptUrl,
}: MixpanelAnalyticsOptions): Script {
	const normalizedToken = token.trim();
	if (!/^[a-f0-9]{32}$/iu.test(normalizedToken)) {
		throw new Error(
			'mixpanelAnalytics: token must be a non-empty ' +
				'32-character hexadecimal string'
		);
	}

	return resolveManifest(mixpanelAnalyticsManifest, {
		initOptions: initOptions ?? {},
		scriptUrl:
			scriptUrl ?? 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		token: normalizedToken,
	});
};
