import type { ConsentState, Script, ScriptCallbackInfo } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

export type ClarityConsentState = 'granted' | 'denied';

export interface ClarityConsentV2Payload {
	ad_Storage: ClarityConsentState;
	analytics_Storage: ClarityConsentState;
}

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

type ClarityFunction = {
	(command: 'consent', value?: boolean): void;
	(command: 'consentv2', value: ClarityConsentV2Payload): void;
	(command: 'event', value: string): void;
	(command: 'identify', id: string, session?: string, page?: string): unknown;
	(command: 'set', key: string, value: string | string[]): void;
	(command: 'start', options?: Record<string, unknown>): void;
	(command: 'upgrade', reason: string): void;
	(command: string, ...args: unknown[]): unknown;
};

declare global {
	interface Window {
		clarity?: ClarityFunction & {
			q?: unknown[][];
		};
	}
}

function toClarityConsentState(
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
}

function getConsentValue(
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
}

function getConsentPayloadFromState(
	consents: ConsentState
): ClarityConsentV2Payload {
	return {
		ad_Storage: consents.marketing ? 'granted' : 'denied',
		analytics_Storage: consents.measurement ? 'granted' : 'denied',
	};
}

function getClarityConsentPayload(
	consents: ConsentState,
	defaultConsent?: ClarityConsentValue
): ClarityConsentV2Payload {
	const fallback = getConsentPayloadFromState(consents);

	if (defaultConsent === undefined) {
		return fallback;
	}

	const booleanConsent = toClarityConsentState(defaultConsent);
	if (booleanConsent) {
		return {
			ad_Storage: booleanConsent,
			analytics_Storage: booleanConsent,
		};
	}

	if (defaultConsent !== null && typeof defaultConsent === 'object') {
		return {
			ad_Storage:
				getConsentValue(defaultConsent, [
					'ad_Storage',
					'ad_storage',
					'marketing',
				]) ?? fallback.ad_Storage,
			analytics_Storage:
				getConsentValue(defaultConsent, [
					'analytics_Storage',
					'analytics_storage',
					'measurement',
					'analytics',
				]) ?? fallback.analytics_Storage,
		};
	}

	return fallback;
}

function syncClarityConsent(
	info: ScriptCallbackInfo,
	defaultConsent?: ClarityConsentValue
): void {
	window.clarity?.(
		'consentv2',
		getClarityConsentPayload(info.consents, defaultConsent)
	);
}

/**
 * Microsoft Clarity vendor manifest.
 *
 * Seeds the global queue stub before loading the vendor bundle and uses
 * Clarity's Consent V2 API for granular analytics and ad storage transitions.
 */
export const clarityManifest = {
	...vendorManifestContract,
	vendor: 'microsoft-clarity',
	category: 'measurement',
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'clarity',
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
			src: '{{scriptUrl}}',
			async: true,
		},
	],
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
 * @throws {Error} When `options.id` is missing or invalid and no `scriptUrl`
 * override is provided. Provide a valid Clarity project id string to prevent
 * this error.
 */
export function clarity({
	id,
	defaultConsent,
	scriptUrl,
}: ClarityOptions): Script {
	const normalizedId = id.trim();

	if (scriptUrl === undefined && normalizedId.length === 0) {
		throw new Error(
			`Invalid Clarity id value "${id}". A non-empty id is required to construct the Clarity loader URL when scriptUrl is not provided.`
		);
	}

	const resolved = resolveManifest(clarityManifest, {
		scriptUrl: scriptUrl ?? `https://www.clarity.ms/tag/${normalizedId}`,
	});
	const onBeforeLoad = resolved.onBeforeLoad;
	const onConsentChange = resolved.onConsentChange;

	return {
		...resolved,
		onBeforeLoad: (info) => {
			onBeforeLoad?.(info);
			syncClarityConsent(info, defaultConsent);
		},
		onConsentChange: (info) => {
			onConsentChange?.(info);
			syncClarityConsent(info);
		},
	};
}
