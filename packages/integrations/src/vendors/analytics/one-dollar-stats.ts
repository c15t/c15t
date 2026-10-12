import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';

/** The classic script from OneDollarStats' installation instructions. */
export const ONE_DOLLAR_STATS_SCRIPT_SRC =
	'https://assets.onedollarstats.com/stonks.js';

/** OneDollarStats is loaded only after measurement consent is granted. */
export const oneDollarStatsManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			defer: true,
			src: ONE_DOLLAR_STATS_SCRIPT_SRC,
			type: 'loadScript',
		},
	],
	vendor: 'one-dollar-stats',
	vendorDetails: {
		homepageUrl: 'https://onedollarstats.com/',
		name: 'OneDollarStats',
		privacyPolicyUrl: 'https://onedollarstats.com/privacy',
	},
} as const satisfies VendorManifest;

/** Lowercase names that are valid in a `data-*` attribute. */
const SETTING_NAME = /^[a-z][a-z0-9-]*$/u;

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
 * @throws {Error} When hostname is not a bare host, or a setting name is not
 * a valid attribute name or its value is not a string.
 */
export const oneDollarStats = function oneDollarStats(
	options: OneDollarStatsOptions = {}
): Script {
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
		if (!SETTING_NAME.test(setting)) {
			throw new Error(
				`oneDollarStats: ${setting} is not a valid setting name; use lowercase letters, digits and hyphens`
			);
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
};
