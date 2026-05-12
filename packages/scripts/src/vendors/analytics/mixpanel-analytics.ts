import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

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
		};
	}
}

/**
 * Mixpanel vendor manifest.
 *
 * Mixpanel can stay loaded across consent changes and toggle tracking with its
 * own opt-in and opt-out APIs.
 */
export const mixpanelAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'mixpanel-analytics',
	category: 'measurement',
	alwaysLoad: true,
	install: [
		{
			type: 'setGlobal',
			name: 'mixpanel',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'defineQueueMethods',
			target: 'mixpanel',
			methods: [
				'track',
				'identify',
				'reset',
				'register',
				'opt_in_tracking',
				'opt_out_tracking',
			],
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
	afterLoad: [
		{
			type: 'callGlobal',
			global: 'mixpanel',
			method: 'init',
			args: ['{{token}}', '{{initOptions}}'],
		},
	],
	onLoadGranted: [
		{
			type: 'callGlobal',
			global: 'mixpanel',
			method: 'opt_in_tracking',
		},
	],
	onLoadDenied: [
		{
			type: 'callGlobal',
			global: 'mixpanel',
			method: 'opt_out_tracking',
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'mixpanel',
			method: 'opt_in_tracking',
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'mixpanel',
			method: 'opt_out_tracking',
		},
	],
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
export function mixpanelAnalytics({
	token,
	initOptions,
	scriptUrl,
}: MixpanelAnalyticsOptions): Script {
	let normalizedToken = '';
	if (typeof token === 'string') {
		normalizedToken = token.trim();
	}
	if (!/^[a-f0-9]{32}$/i.test(normalizedToken)) {
		throw new Error(
			'mixpanelAnalytics: token must be a non-empty 32-character hexadecimal string'
		);
	}

	return resolveManifest(mixpanelAnalyticsManifest, {
		token: normalizedToken,
		initOptions: initOptions ?? {},
		scriptUrl: scriptUrl ?? 'https://cdn.mxpnl.com/libs/mixpanel-2.78.0.min.js',
	});
}
