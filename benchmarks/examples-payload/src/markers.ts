/**
 * Boundary detection by marker strings.
 *
 * Examples don't emit source maps, so the runner can't attribute bytes to
 * modules. Instead each boundary has strings that only its code carries,
 * and an asset that contains one counts toward that boundary. Every marker
 * is ASCII, because some minifiers escape non-ASCII characters.
 */
import type { ExamplesPayloadBoundaryMetric } from '@c15t/benchmarking/examples-payload';

export type MarkerTable = Record<ExamplesPayloadBoundaryMetric, string[]>;

/** Markers that don't depend on the fixture backend. */
export const STATIC_MARKERS: Omit<MarkerTable, 'snapshotBytes'> = {
	// `@c15t/dev-tools` class names.
	devtoolsBytes: ['c15t-dev-tools__'],
	// The CMP API global from `@c15t/iab`.
	iabBytes: ['__tcfapi'],
	// The cookie banner title in German and French.
	nonEnLocaleBytes: ['Wir respektieren deine', 'Nous respectons votre vie'],
	// A rule id from `recommendedPolicyRules()` that the fixture doesn't use.
	offlinePolicyBytes: ['quebec_opt_in'],
	// Errors thrown only by core's manifest transport, the browser resolver.
	resolverBytes: [
		'createManifestTransport: either',
		'c15t manifest transport: /manifest responded',
	],
};

interface FixtureManifestFields {
	revision?: unknown;
	policyPacks?: { fingerprints?: { policy?: unknown } }[];
	policyRules?: { fingerprints?: { policy?: unknown } }[];
}

/**
 * Strings that only a copy of the fixture manifest carries: its revision
 * hash and the fingerprints of policies the `/init` answer doesn't
 * resolve. A server-rendered page legitimately carries the resolved
 * policy's fingerprint, so that one would not show a snapshot. Policy ids
 * aren't used because the fixture's ids (`europe_opt_in`) also appear in
 * the preset code.
 *
 * @param manifest - The manifest the fixture backend serves.
 * @param init - The `/init` answer the fixture backend serves.
 * @returns The snapshot markers, never empty.
 * @throws {Error} When no marker is left to detect a snapshot by.
 */
export const snapshotMarkersOf = function snapshotMarkersOf(
	manifest: unknown,
	init: unknown = null
): string[] {
	const initText = JSON.stringify(init) ?? '';
	const fields = (manifest ?? {}) as FixtureManifestFields;
	const markers: string[] = [];
	if (typeof fields.revision === 'string') {
		markers.push(fields.revision);
	}
	for (const pack of [
		...(fields.policyPacks ?? []),
		...(fields.policyRules ?? []),
	]) {
		const policy = pack.fingerprints?.policy;
		if (typeof policy === 'string') {
			markers.push(policy);
		}
	}
	const unique = markers.filter((marker) => !initText.includes(marker));
	if (unique.length === 0) {
		throw new Error(
			'The fixture manifest has no revision or unresolved policy fingerprints to detect a snapshot by.'
		);
	}
	return unique;
};

/**
 * The full marker table for a run.
 *
 * @param manifest - The manifest the fixture backend serves.
 * @param init - The `/init` answer the fixture backend serves.
 */
export const markerTableFor = function markerTableFor(
	manifest: unknown,
	init: unknown = null
): MarkerTable {
	return {
		...STATIC_MARKERS,
		snapshotBytes: snapshotMarkersOf(manifest, init),
	};
};

/**
 * Which boundaries a piece of code carries.
 *
 * @param code - Asset or document text.
 * @param markers - Marker table for the run.
 * @returns The boundary metrics whose markers appear in `code`.
 */
export const findBoundaries = function findBoundaries(
	code: string,
	markers: MarkerTable
): ExamplesPayloadBoundaryMetric[] {
	return (Object.keys(markers) as ExamplesPayloadBoundaryMetric[]).filter(
		(metric) => markers[metric].some((marker) => code.includes(marker))
	);
};
