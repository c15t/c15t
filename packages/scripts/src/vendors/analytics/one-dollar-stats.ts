import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

/** The classic script from OneDollarStats' installation instructions. */
export const ONE_DOLLAR_STATS_SCRIPT_SRC =
	'https://assets.onedollarstats.com/stonks.js';

/** OneDollarStats is loaded only after measurement consent is granted. */
export const oneDollarStatsManifest = {
	...vendorManifestContract,
	vendor: 'one-dollar-stats',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: ONE_DOLLAR_STATS_SCRIPT_SRC,
			defer: true,
		},
	],
} as const satisfies VendorManifest;

export interface OneDollarStatsOptions {
	/**
	 * Bare hostname, such as `docs.example.com`. Overrides the event hostname
	 * on every host, including production. Required for local dev mode.
	 */
	hostname?: string;
	/**
	 * Tracker settings forwarded as `data-*` attributes. Use string values,
	 * e.g. `devmode: 'true'`, `autocollect: 'false'`, or a custom `url`.
	 * Setting `'hash-routing': 'false'` omits the presence-based attribute.
	 */
	[setting: string]: string | undefined;
}

/**
 * Creates a consent-gated OneDollarStats script. No API key is required.
 * The tracker reads data attributes from `document.currentScript` and
 * handles client-side navigation itself.
 *
 * @param options - Tracker settings without the `data-` prefix.
 * @returns The OneDollarStats script configuration.
 * @throws When hostname is not a bare host or a setting is not a string.
 */
export function oneDollarStats(options: OneDollarStatsOptions = {}): Script {
	if (
		options.hostname !== undefined &&
		(typeof options.hostname !== 'string' ||
			!/^[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*(?::\d+)?$/u.test(options.hostname))
	) {
		throw new Error(
			'oneDollarStats: hostname must be a bare host name like docs.example.com, without a scheme, path, query, or fragment'
		);
	}

	const attributes: Record<string, string> = {};
	for (const [setting, value] of Object.entries(options)) {
		if (value === undefined) {
			continue;
		}
		if (typeof value !== 'string') {
			throw new Error(`oneDollarStats: ${setting} must be a string`);
		}
		if (setting === 'hash-routing' && value === 'false') {
			continue;
		}
		attributes[`data-${setting}`] = value;
	}

	return {
		...resolveManifest(oneDollarStatsManifest),
		attributes,
	};
}
