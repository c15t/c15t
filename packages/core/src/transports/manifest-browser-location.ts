/**
 * Whether every location gets the same banner from a manifest. It runs the
 * policy matcher once per kind of location, so it lives apart from the
 * first-load transport code: `manifestNeedsLocation()` and the lazy
 * resolver import it, and an app that calls neither never bundles it.
 *
 * @internal
 */
import { resolvePolicyResolutionFromManifest } from '@c15t/schema/types';
import type { ConsentManifest, PolicyResolution } from '@c15t/schema/types';

import { experienceKey } from './manifest-browser-packs';

/** Stands in for a region no pack lists. Never a real subdivision code. */
const UNLISTED_REGION = '?';

/**
 * One location for every way the matcher can treat a visitor: unknown,
 * an unlisted country, and each listed country with its listed regions,
 * an unlisted region and no region. Any location resolves the same way as
 * one of these, so their outcomes are every outcome the manifest has.
 */
const representativeLocations = function representativeLocations(
	manifest: ConsentManifest
): { countryCode: string | null; regionCode: string | null }[] {
	const countries = new Set<string>();
	const locations: { countryCode: string | null; regionCode: string | null }[] =
		[{ countryCode: null, regionCode: null }];
	for (const { match } of manifest.policyPacks ?? []) {
		for (const country of [
			...(match.countries ?? []),
			...(match.regionFallbacks ?? []),
		]) {
			countries.add(country.trim().toUpperCase());
		}
		for (const { country, region } of match.regions ?? []) {
			countries.add(country.trim().toUpperCase());
			locations.push({ countryCode: country, regionCode: region });
		}
	}
	for (const country of countries) {
		locations.push(
			{ countryCode: country, regionCode: null },
			{ countryCode: country, regionCode: UNLISTED_REGION }
		);
	}
	// `ZZ` is a user-assigned ISO code no real visitor has. The matcher
	// takes any string, so lengthen it until the manifest does not list it.
	let unlisted = 'ZZ';
	while (countries.has(unlisted)) {
		unlisted += 'Z';
	}
	locations.push({ countryCode: unlisted, regionCode: null });
	return locations;
};

/** A resolution that matched a pack. */
export type MatchedResolution = Extract<
	PolicyResolution,
	{ status: 'matched' }
>;

const locationFreeOutcomes = new WeakMap<
	ConsentManifest,
	MatchedResolution | null
>();

/**
 * The resolution every location gives this manifest, when they all give
 * the same experience; `null` when any two differ or any location fails
 * to match. Computed once per manifest object.
 *
 * @param manifest - The manifest.
 * @returns The shared resolution, or `null`.
 * @internal
 */
export const locationFreeOutcome = function locationFreeOutcome(
	manifest: ConsentManifest
): MatchedResolution | null {
	if (locationFreeOutcomes.has(manifest)) {
		return locationFreeOutcomes.get(manifest) ?? null;
	}
	let outcome: MatchedResolution | null = null;
	let key: string | undefined;
	let locations: ReturnType<typeof representativeLocations> = [];
	try {
		locations = representativeLocations(manifest);
	} catch {
		// Malformed matchers: the resolver fails them too, so ask `/init`.
	}
	for (const location of locations) {
		const resolution = resolvePolicyResolutionFromManifest(manifest, location);
		if (resolution.status !== 'matched') {
			outcome = null;
			break;
		}
		const next = experienceKey({
			fingerprints: resolution.fingerprints,
			rule: resolution.policy,
		});
		if (key !== undefined && next !== key) {
			outcome = null;
			break;
		}
		key = next;
		outcome = resolution;
	}
	locationFreeOutcomes.set(manifest, outcome);
	return outcome;
};
