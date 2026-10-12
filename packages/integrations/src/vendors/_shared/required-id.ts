import type { Script } from '@c15t/core';

import type { VendorManifest } from '../../types';

/**
 * What a helper knows about the script it would have returned: its consent
 * category and the manifest that names and describes the vendor.
 */
export interface SkippedScript {
	category: Script['category'];
	manifest: Pick<VendorManifest, 'vendor' | 'vendorDetails'>;
}

/**
 * Normalizes a required vendor ID option.
 *
 * @param value - Caller-supplied value. Strings are trimmed; finite numbers
 * are converted to strings for callers that pass numeric IDs.
 * @returns The ID without surrounding whitespace, or `undefined` when the
 * value is missing, blank, or not a string or finite number.
 *
 * @example
 * ```ts
 * readId(' 123456 '); // '123456'
 * readId(''); // undefined
 * ```
 */
export const readId = function readId(value: unknown): string | undefined {
	let normalized = '';
	if (typeof value === 'string') {
		normalized = value.trim();
	} else if (typeof value === 'number' && Number.isFinite(value)) {
		normalized = String(value);
	}

	return normalized.length > 0 ? normalized : undefined;
};

/**
 * Logs a configuration problem and returns a script that never loads.
 *
 * Vendor IDs often come from environment variables, so a blank value is a
 * deployment problem rather than a code bug. Throwing during render would
 * take the consent UI down with the app, so the helper reports the problem
 * with `console.error` and hands c15t a callback-only script with no
 * callbacks: nothing is added to the page and no vendor code runs. The
 * script keeps the manifest's vendor slug and details, so the vendor stays
 * listed in the preference center while the ID is missing.
 *
 * @param problem - What is wrong, prefixed with the helper name, for example
 * `posthog: missing or invalid id`.
 * @param script - Consent category and manifest of the script the helper
 * would have returned.
 * @returns A callback-only script without callbacks.
 *
 * @example
 * ```ts
 * skipScript('posthog: missing or invalid id', {
 *   category: 'measurement',
 *   manifest: posthogManifest,
 * });
 * ```
 */
export const skipScript = function skipScript(
	problem: string,
	{ category, manifest }: SkippedScript
): Script {
	console.error(`${problem}. The script will not load.`);

	return {
		callbackOnly: true,
		category,
		id: manifest.vendor,
		vendor: manifest.vendor,
		vendorDetails: manifest.vendorDetails,
	};
};

/**
 * Logs `<helper>: missing or invalid <option>` and returns a script that
 * never loads. See {@link skipScript}.
 *
 * @param helper - Name of the helper, used as the message prefix.
 * @param option - Name of the missing option.
 * @param script - Consent category and manifest of the script the helper
 * would have returned.
 * @returns A callback-only script without callbacks.
 */
export const skipMissingId = function skipMissingId(
	helper: string,
	option: string,
	script: SkippedScript
): Script {
	return skipScript(`${helper}: missing or invalid ${option}`, script);
};
