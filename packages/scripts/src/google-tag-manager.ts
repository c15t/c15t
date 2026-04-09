import type { Script } from 'c15t';
import { applyScriptOverrides, resolveManifest } from './resolve';
import type { VendorManifest } from './types';

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
	vendor: 'google-tag-manager',
	category: 'necessary',
	alwaysLoad: true,
	bootstrap: [
		{
			type: 'inlineScript',
			code: `
window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() { window.dataLayer.push(arguments); };
			`.trim(),
		},
	],
	install: [
		{
			type: 'inlineScript',
			code: `
window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
			`.trim(),
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
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'google-tag-manager'
	 * - `src`: `https://www.googletagmanager.com/gtm.js?id=${id}`
	 * - `category`: 'necessary' (You control what scripts get loaded via Google Tag Manager)
	 * - `alwaysLoad`: true
	 * - `async`: true
	 */
	script?: Partial<Script>;
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
	script,
	updateEventName,
}: GoogleTagManagerOptions): Script {
	const resolved = resolveManifest(googleTagManagerManifest, {
		id,
		updateEventName: updateEventName ?? 'consent-update',
	});

	return script ? applyScriptOverrides(resolved, script) : resolved;
}

// Re-export consent mapping utilities for use by google-tag.ts
export {
	/** @deprecated Use `googleTagManagerManifest.consentMapping` instead */
	DEFAULT_GTM_CONSENT_CONFIG,
	/** @deprecated Use `resolveManifest` with a `consentMapping` instead */
	mapConsentStateToGTM,
};

// Legacy types kept for backward compatibility
import type { AllConsentNames, ConsentState } from 'c15t';

interface GTMConsentConfiguration {
	ad_storage: 'granted' | 'denied';
	ad_personalization: 'granted' | 'denied';
	ad_user_data: 'granted' | 'denied';
	analytics_storage: 'granted' | 'denied';
	personalization_storage: 'granted' | 'denied';
	functionality_storage: 'granted' | 'denied';
	security_storage: 'granted' | 'denied';
}

const DEFAULT_GTM_CONSENT_CONFIG: GTMConsentConfiguration = {
	functionality_storage: 'denied',
	security_storage: 'denied',
	analytics_storage: 'denied',
	ad_storage: 'denied',
	ad_user_data: 'denied',
	ad_personalization: 'denied',
	personalization_storage: 'denied',
} as const;

const CONSENT_STATE_TO_GTM_MAPPING: Record<
	AllConsentNames,
	(keyof GTMConsentConfiguration)[]
> = {
	necessary: ['security_storage'],
	functionality: ['functionality_storage'],
	measurement: ['analytics_storage'],
	marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
	experience: ['personalization_storage'],
} as const;

function mapConsentStateToGTM(
	consentState: ConsentState
): GTMConsentConfiguration {
	const gtmConfig: GTMConsentConfiguration = { ...DEFAULT_GTM_CONSENT_CONFIG };
	for (const consentType of Object.keys(consentState) as AllConsentNames[]) {
		const isGranted = consentState[consentType];
		const gtmConsentTypes = CONSENT_STATE_TO_GTM_MAPPING[consentType];
		for (const gtmType of gtmConsentTypes) {
			gtmConfig[gtmType] = isGranted ? 'granted' : 'denied';
		}
	}
	return gtmConfig;
}
