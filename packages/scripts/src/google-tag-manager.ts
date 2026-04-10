import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

// Extended Window interface to include GTM-specific properties
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

/**
 * Google Tag Manager vendor manifest.
 *
 * Defines GTM as a declarative integration:
 * - Initializes dataLayer and gtag function before the container loads
 * - Maps c15t consent categories to Google Consent Mode v2 types
 * - Signals consent state via `gtag('consent', 'default'|'update', ...)`
 */
export const googleTagManagerManifest = {
	...vendorManifestContract,
	vendor: 'google-tag-manager',
	category: 'necessary',
	alwaysLoad: true,
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'dataLayer',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'defineQueueFunction',
			name: 'gtag',
			queue: 'dataLayer',
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'pushToQueue',
			queue: 'dataLayer',
			value: {
				'gtm.start': '{{loadTime}}',
				event: 'gtm.js',
			},
		},
		{
			type: 'loadScript',
			src: 'https://www.googletagmanager.com/gtm.js?id={{id}}',
			async: true,
		},
	],
	onConsentChange: [
		{
			type: 'callGlobal',
			global: 'gtag',
			args: ['event', '{{updateEventName}}'],
		},
	],
	consentMapping: {
		necessary: ['security_storage'],
		functionality: ['functionality_storage'],
		measurement: ['analytics_storage'],
		marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
		experience: ['personalization_storage'],
	},
	consentSignal: 'gtag',
} as const satisfies VendorManifest;

export interface GoogleTagManagerOptions {
	/**
	 * Your Google Tag Manager container ID. Begins with 'GTM-'.
	 * @example `GTM-1234XXX`
	 */
	id: string;

	/**
	 * Custom event name fired after consent updates.
	 * Can be used as a trigger in GTM to load scripts once consent is updated.
	 *
	 * @default 'consent-update'
	 */
	updateEventName?: string;

	/**
	 * Custom mapping from c15t consent categories to Google Consent Mode v2 types.
	 * Overrides the default mapping when provided.
	 *
	 * @default
	 * ```ts
	 * {
	 *   necessary: ['security_storage'],
	 *   functionality: ['functionality_storage'],
	 *   measurement: ['analytics_storage'],
	 *   marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
	 *   experience: ['personalization_storage'],
	 * }
	 * ```
	 */
	consentMapping?: Record<string, string[]>;
}

/**
 * Creates a Google Tag Manager script.
 * GTM can be used for managing the consent of other scripts via Google Tag Manager consent mode.
 * We recommend using c15t's script loader instead so your script logic is centralised.
 *
 * @param options - The options for the Google Tag Manager script.
 * @returns The Google Tag Manager script.
 */
export function googleTagManager({
	id,
	updateEventName,
	consentMapping,
}: GoogleTagManagerOptions): Script {
	const manifest = consentMapping
		? { ...googleTagManagerManifest, consentMapping }
		: googleTagManagerManifest;

	const resolved = resolveManifest(manifest, {
		id,
		loadTime: Date.now(),
		updateEventName: updateEventName ?? 'consent-update',
	});

	return resolved;
}
