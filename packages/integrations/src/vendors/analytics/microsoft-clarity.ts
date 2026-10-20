import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/**
 * Microsoft Clarity Consent V2 storage state.
 *
 * Clarity accepts string consent values instead of booleans for its granular
 * `ad_Storage` and `analytics_Storage` channels.
 */
export type ClarityConsentState = 'granted' | 'denied';

/**
 * Consent V2 payload sent to Microsoft Clarity.
 *
 * c15t maps `marketing` consent to `ad_Storage` and `measurement` consent to
 * `analytics_Storage`.
 */
export interface ClarityConsentV2Payload {
	ad_Storage: ClarityConsentState;
	analytics_Storage: ClarityConsentState;
}

/**
 * Optional boot-time consent override accepted by the Clarity helper.
 *
 * Booleans apply the same value to both Clarity Consent V2 channels. Object
 * values may use Clarity keys or c15t category aliases and are merged over the
 * current c15t consent state.
 */
export type ClarityConsentValue =
	| boolean
	| Partial<
			Record<
				| keyof ClarityConsentV2Payload
				| 'ad_storage'
				| 'analytics_storage'
				| 'marketing'
				| 'measurement'
				| 'analytics',
				ClarityConsentState | boolean
			>
	  >;

interface ClarityFunction {
	(command: 'consent', value?: boolean): void;
	(command: 'consentv2', value: ClarityConsentV2Payload): void;
	(command: 'event' | 'upgrade', value: string): void;
	(command: 'identify', id: string, session?: string, page?: string): unknown;
	(command: 'set', key: string, value: string | string[]): void;
	(command: 'start', options?: Record<string, unknown>): void;
	(command: string, ...args: unknown[]): unknown;
}

declare global {
	interface Window {
		clarity?: ClarityFunction & {
			q?: unknown[][];
		};
	}
}

/**
 * Converts c15t and user-supplied consent values into Clarity Consent V2 state.
 *
 * @internal
 */
const toClarityConsentState = function toClarityConsentState(
	value: unknown
): ClarityConsentState | undefined {
	if (value === true) {
		return 'granted';
	}

	if (value === false) {
		return 'denied';
	}

	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.toLowerCase();
	if (normalized === 'granted' || normalized === 'true') {
		return 'granted';
	}

	if (normalized === 'denied' || normalized === 'false') {
		return 'denied';
	}

	return undefined;
};

const getConsentValue = function getConsentValue(
	value: Record<string, unknown>,
	keys: string[]
): ClarityConsentState | undefined {
	for (const key of keys) {
		const consent = toClarityConsentState(value[key]);
		if (consent) {
			return consent;
		}
	}

	return undefined;
};

/**
 * The Consent V2 values `defaultConsent` sets, over the ones c15t's consent
 * state gives.
 *
 * @internal
 */
const getClarityConsentDefaults = function getClarityConsentDefaults(
	defaultConsent: ClarityConsentValue | undefined
): Partial<ClarityConsentV2Payload> | undefined {
	if (defaultConsent === undefined) {
		return undefined;
	}

	const booleanConsent = toClarityConsentState(defaultConsent);
	if (booleanConsent) {
		return {
			ad_Storage: booleanConsent,
			analytics_Storage: booleanConsent,
		};
	}

	if (defaultConsent === null || typeof defaultConsent !== 'object') {
		return undefined;
	}

	const adStorage = getConsentValue(defaultConsent, [
		'ad_Storage',
		'ad_storage',
		'marketing',
	]);
	const analyticsStorage = getConsentValue(defaultConsent, [
		'analytics_Storage',
		'analytics_storage',
		'measurement',
		'analytics',
	]);
	return {
		...(adStorage && { ad_Storage: adStorage }),
		...(analyticsStorage && { analytics_Storage: analyticsStorage }),
	};
};

/**
 * Microsoft Clarity vendor manifest.
 *
 * Seeds the global queue stub before loading the vendor bundle and uses
 * Clarity's Consent V2 API for granular analytics and ad storage transitions.
 * A vendor the subject turned off is told nothing is granted, whatever the
 * category state or the configured default says.
 */
export const clarityManifest = {
	...vendorManifestContract,
	bootstrap: [
		{
			ifUndefined: true,

			name: 'clarity',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			type: 'defineStubFunction',
		},
	],
	category: 'measurement',
	consentMapping: {
		marketing: ['ad_Storage'],
		measurement: ['analytics_Storage'],
	},
	consentSignal: 'clarity',
	consentSignalDefaults: '{{consentDefaults}}',
	install: [
		{
			async: true,

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'microsoft-clarity',
	vendorDetails: {
		homepageUrl: 'https://clarity.microsoft.com/',
		legalName: 'Microsoft Corporation',
		name: 'Microsoft Clarity',
		privacyPolicyUrl: 'https://www.microsoft.com/privacy/privacystatement',
	},
} as const satisfies VendorManifest;

export interface ClarityOptions {
	/**
	 * Your Microsoft Clarity project ID.
	 * @example `abcdef1234`
	 */
	id: string;

	/**
	 * Optional initial Consent V2 value queued before the script loads.
	 *
	 * By default, c15t maps `measurement` to `analytics_Storage` and `marketing`
	 * to `ad_Storage`. Pass this only when boot-time consent must override the
	 * current c15t consent state.
	 */
	defaultConsent?: ClarityConsentValue;

	/** Clarity loader URL. */
	scriptUrl?: string;
}

/**
 * Creates a Microsoft Clarity script.
 *
 * @param options - The options for the Clarity script.
 * @returns The Clarity script configuration.
 * @remarks When `id` is missing or blank and no `scriptUrl` override is set, the helper logs
 *   `clarity: missing or invalid id` with `console.error` and
 *   returns a script that never loads.
 */
export const clarity = function clarity({
	id,
	defaultConsent,
	scriptUrl,
}: ClarityOptions): Script {
	const scriptUrlOverride = trimToUndefined(scriptUrl);
	const normalizedId = readId(id);
	if (scriptUrlOverride === undefined && normalizedId === undefined) {
		return skipMissingId('clarity', 'id', {
			category: 'measurement',
			manifest: clarityManifest,
		});
	}

	return resolveManifest(clarityManifest, {
		consentDefaults: getClarityConsentDefaults(defaultConsent),
		scriptUrl: resolveScriptUrl(
			scriptUrlOverride,
			`https://www.clarity.ms/tag/${normalizedId ?? ''}`
		),
	});
};
