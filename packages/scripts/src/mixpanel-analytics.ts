import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		mixpanel: {
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
			src: '{{scriptSrc}}',
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
	/**
	 * Your Mixpanel project token.
	 * @example `1234567890abcdef1234567890abcdef`
	 */
	token: string;

	/**
	 * Mixpanel init options passed after the library loads.
	 *
	 * The manifest engine cannot serialize Mixpanel's full custom bootstrap
	 * snippet, so named instances and nested `people.*` queue helpers are out of
	 * scope for this helper.
	 */
	initOptions?: Record<string, unknown>;

	/** Mixpanel loader URL. */
	scriptSrc?: string;
}

/**
 * Creates a Mixpanel Analytics script.
 *
 * @param options - The options for the Mixpanel Analytics script
 * @returns The Mixpanel Analytics script configuration
 *
 * @example
 * ```ts
 * const mixpanelAnalyticsScript = mixpanelAnalytics({
 *   token: '1234567890abcdef1234567890abcdef',
 * });
 * ```
 *
 * @see {@link https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript} Mixpanel JavaScript SDK documentation
 */
export function mixpanelAnalytics({
	token,
	initOptions,
	scriptSrc,
}: MixpanelAnalyticsOptions): Script {
	const resolved = resolveManifest(mixpanelAnalyticsManifest, {
		token,
		initOptions: initOptions ?? {},
		scriptSrc:
			scriptSrc ?? 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
	});

	return resolved;
}
