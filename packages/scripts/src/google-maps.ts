import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		google?: {
			maps?: Record<string, unknown>;
		};
	}
}

/**
 * Google Maps vendor manifest.
 *
 * This helper stays fully declarative by expressing Google Maps configuration
 * through the loader URL rather than the callback-driven runtime API.
 */
export const googleMapsManifest = {
	...vendorManifestContract,
	vendor: 'google-maps',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface GoogleMapsOptions {
	/**
	 * Your Google Maps JavaScript API key.
	 */
	apiKey: string;

	/**
	 * Libraries to preload with the Maps API.
	 * @default ['places']
	 */
	libraries?: string[];

	/**
	 * Language code for the map UI and geocoding results.
	 */
	language?: string;

	/**
	 * Region code used to bias geocoding results.
	 */
	region?: string;

	/**
	 * Google Maps JavaScript API version.
	 * @default 'weekly'
	 */
	v?: 'weekly' | 'quarterly' | 'beta' | 'alpha' | string;

	/** Full Google Maps loader URL override. */
	scriptSrc?: string;
}

function buildGoogleMapsScriptSrc({
	apiKey,
	libraries,
	language,
	region,
	v,
}: Omit<GoogleMapsOptions, 'scriptSrc'>): string {
	const url = new URL('https://maps.googleapis.com/maps/api/js');
	const resolvedLibraries = libraries ?? ['places'];

	url.searchParams.set('key', apiKey);
	url.searchParams.set('loading', 'async');

	if (resolvedLibraries.length > 0) {
		url.searchParams.set('libraries', resolvedLibraries.join(','));
	}

	if (language) {
		url.searchParams.set('language', language);
	}

	if (region) {
		url.searchParams.set('region', region);
	}

	if (v) {
		url.searchParams.set('v', v);
	} else {
		url.searchParams.set('v', 'weekly');
	}

	return url.toString();
}

/**
 * Creates a Google Maps script.
 *
 * This helper only models the serializable loader configuration. Readiness
 * callbacks such as `google.maps.__ib__` must be handled in application code.
 *
 * @param options - The options for the Google Maps script
 * @returns The Google Maps script configuration
 */
export function googleMaps({
	apiKey,
	libraries,
	language,
	region,
	v,
	scriptSrc,
}: GoogleMapsOptions): Script {
	let resolvedScriptSrc = scriptSrc;

	if (!resolvedScriptSrc) {
		resolvedScriptSrc = buildGoogleMapsScriptSrc({
			apiKey,
			libraries,
			language,
			region,
			v,
		});
	}

	const resolved = resolveManifest(googleMapsManifest, {
		scriptSrc: resolvedScriptSrc,
	});

	return resolved;
}
