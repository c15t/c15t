/**
 * Cheap reads of a manifest's policy packs, for the first-load transport:
 * no matcher, no hashing. `./manifest-browser-location` gives the exact
 * answer once the resolver chunk is loaded.
 *
 * @internal
 */
import type {
	ConsentManifest,
	ConsentManifestPolicyPack,
} from '@c15t/schema/types';

/** Whether any pack is keyed by country or region. */
export const hasLocationMatchers = function hasLocationMatchers(
	manifest: ConsentManifest
): boolean {
	return (manifest.policyPacks ?? []).some(
		(pack) =>
			(pack.match.countries?.length ?? 0) > 0 ||
			(pack.match.regions?.length ?? 0) > 0 ||
			(pack.match.regionFallbacks?.length ?? 0) > 0
	);
};

/**
 * What a visitor experiences under a pack: the behavior the fingerprints
 * hash (model, prompt, scope, defaults, validity, GPC handling, copy
 * revision) plus the message profile, which changes the banner's copy. The
 * policy id is left out on purpose: two packs with the same behavior show
 * the same banner.
 */
export const experienceKey = function experienceKey({
	fingerprints,
	rule,
}: Pick<ConsentManifestPolicyPack, 'fingerprints' | 'rule'>): string {
	return JSON.stringify([
		fingerprints.policy,
		fingerprints.choice,
		fingerprints.notice,
		fingerprints.legacyMaterial ?? null,
		rule.i18n ?? null,
	]);
};

/**
 * Whether every location might get the same banner: every pack gives the
 * same experience and a default pack catches unlisted countries. `false`
 * means some location certainly gets another banner, or none.
 *
 * @param manifest - The manifest.
 * @returns Whether the exact check in the resolver chunk is worth loading.
 * @internal
 */
export const mayBeLocationFree = function mayBeLocationFree(
	manifest: ConsentManifest
): boolean {
	const packs = manifest.policyPacks ?? [];
	const key = packs[0] && experienceKey(packs[0]);
	return (
		packs.some((pack) => pack.match.isDefault === true) &&
		packs.every((pack) => experienceKey(pack) === key)
	);
};
