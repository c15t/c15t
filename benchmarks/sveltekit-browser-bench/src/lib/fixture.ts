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

/** URL of the consent-gated stand-in for a third-party script. */
export const benchScriptURL = '/bench-third-party.js';

/** URL the network blocker gates under `measurement`. */
export const benchBeaconURL = '/bench-beacon.txt';

/** The consent-gated script the `scripts` arms load. */
export const benchScripts = [
	{
		category: 'measurement' as const,
		id: 'bench-third-party',
		src: benchScriptURL,
	},
];

/** A blocker rule that matches the beacon the `scripts` arms send. */
export const benchNetworkBlocker = {
	rules: [
		{
			category: 'measurement' as const,
			domain: '127.0.0.1',
			pathIncludes: benchBeaconURL,
		},
	],
};
