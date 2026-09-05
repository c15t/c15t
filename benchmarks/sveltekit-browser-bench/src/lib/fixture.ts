/**
 * Client-safe fixture constants for the SvelteKit browser bench.
 *
 * The fixture backend itself lives in `$lib/server/fixture` — SvelteKit
 * refuses to bundle that into the browser, which is the point: the measured
 * arms must not carry the fixture's manifest or its Node imports.
 */

/** Categories every bench arm configures. */
export const benchConsentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const;
