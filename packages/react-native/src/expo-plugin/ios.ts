import type { InfoPlist } from '@expo/config-plugins';

import { IOS_PLIST_KEY } from './constants';
import { IOS_TRANSPORT_MODE } from './params';
import type { ResolvedC15tParams } from './params';

/**
 * The `ios.privacyManifests` shape, narrowed to what c15t declares.
 *
 * Written into the Expo config rather than straight to disk: prebuild's default
 * plugins run `IOSConfig.PrivacyInfo.withPrivacyInfo`, which merges this field
 * into the app's `PrivacyInfo.xcprivacy`. A plugin that wrote the file itself
 * would fight that merge on every `expo prebuild`.
 */
export interface C15tPrivacyManifestDeclarations {
	/** Whether the shipped binary uses data for tracking. */
	NSPrivacyTracking: boolean;
	/** Hosts the binary may send tracking data to. */
	NSPrivacyTrackingDomains: string[];
}

/**
 * Build the flat `Info.plist` entries that configure the core.
 *
 * Absent values stay absent rather than empty: the bridge treats a missing key
 * as "not configured" and falls back to the safe option, while an empty string
 * is a value it has to parse.
 */
export const buildInfoPlistEntries = function buildInfoPlistEntries(
	params: ResolvedC15tParams
): Record<string, string | boolean> {
	const entries: Record<string, string | boolean> = {
		[IOS_PLIST_KEY.transportMode]: IOS_TRANSPORT_MODE[params.mode],
	};

	if (params.backendURL !== null) {
		entries[IOS_PLIST_KEY.backendURL] = params.backendURL;
	}
	if (params.initURL !== null) {
		entries[IOS_PLIST_KEY.initURL] = params.initURL;
	}
	if (params.domain !== null) {
		entries[IOS_PLIST_KEY.domain] = params.domain;
	}
	if (params.publicKey !== null) {
		entries[IOS_PLIST_KEY.publicKey] = params.publicKey;
	}
	if (params.forceGPC) {
		entries[IOS_PLIST_KEY.gpc] = true;
	}
	// Only the opt-out is worth recording; on is the bridge's own default.
	if (!params.autoBootstrap) {
		entries[IOS_PLIST_KEY.autoBootstrap] = false;
	}

	return entries;
};

const isSkAdNetworkItem = function isSkAdNetworkItem(
	value: unknown
): value is { SKAdNetworkIdentifier: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { SKAdNetworkIdentifier?: unknown })
			.SKAdNetworkIdentifier === 'string'
	);
};

/**
 * Union the plugin's identifiers with whatever the host already declared.
 *
 * `SKAdNetworkItems` is one array for the whole app and an ad partner's plugin
 * writes to the same key, so neither side may overwrite it.
 */
const mergeSkAdNetworkItems = function mergeSkAdNetworkItems(
	existing: unknown,
	identifiers: readonly string[]
): { SKAdNetworkIdentifier: string }[] {
	const current = Array.isArray(existing) ? existing : [];
	const merged = current.filter(isSkAdNetworkItem);
	const seen = new Set(merged.map((item) => item.SKAdNetworkIdentifier));

	for (const identifier of identifiers) {
		if (!seen.has(identifier)) {
			seen.add(identifier);
			merged.push({ SKAdNetworkIdentifier: identifier });
		}
	}

	return merged;
};

/**
 * Write c15t's bootstrap config and tracking keys into `Info.plist`.
 *
 * The App Tracking Transparency keys appear only when the host opted in. Apple
 * reads `NSUserTrackingUsageDescription` as a promise about the app, and a
 * binary that carries it without ever asking looks like a harvest to a reviewer.
 * Consent to marketing cookies is not Apple tracking authorization, so nothing
 * about a consent configuration turns these on.
 *
 * @param params - Resolved plugin parameters.
 * @param infoPlist - The `Info.plist` as it stands.
 * @returns A new plist object; the input is not mutated.
 */
export const applyInfoPlist = function applyInfoPlist(
	params: ResolvedC15tParams,
	infoPlist: InfoPlist
): InfoPlist {
	const next: InfoPlist = { ...infoPlist, ...buildInfoPlistEntries(params) };

	const att = params.appTrackingTransparency;
	if (!att.enabled) {
		return next;
	}

	// A host that already wrote its own prompt string keeps it.
	if (typeof next.NSUserTrackingUsageDescription !== 'string') {
		next.NSUserTrackingUsageDescription = att.usageDescription ?? '';
	}

	if (att.skAdNetworkIdentifiers.length > 0) {
		next.SKAdNetworkItems = mergeSkAdNetworkItems(
			infoPlist.SKAdNetworkItems,
			att.skAdNetworkIdentifiers
		);
	}

	return next;
};

/**
 * Build the `ios.privacyManifests` entries c15t is responsible for.
 *
 * The core declares no required-reason API types: it stores consent in the
 * Keychain and its own application-support files, and neither is on Apple's
 * required-reason list. Collected data types stay with the host, whose App Store
 * Connect declaration is the thing that has to match.
 */
export const buildPrivacyManifestDeclarations =
	function buildPrivacyManifestDeclarations(
		params: ResolvedC15tParams
	): C15tPrivacyManifestDeclarations {
		return {
			NSPrivacyTracking: params.appTrackingTransparency.enabled,
			NSPrivacyTrackingDomains: [...params.privacyTrackingDomains],
		};
	};
