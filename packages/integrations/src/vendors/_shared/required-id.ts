import type { Script } from '@c15t/core';

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
 * callbacks: nothing is added to the page and no vendor code runs.
 *
 * @param problem - What is wrong, prefixed with the helper name, for example
 * `posthog: missing or invalid id`.
 * @param script - ID and consent category of the script the helper would
 * have returned.
 * @returns A callback-only script without callbacks.
 *
 * @example
 * ```ts
 * skipScript('posthog: missing or invalid id', {
 *   category: 'measurement',
 *   id: 'posthog',
 * });
 * ```
 */
export const skipScript = function skipScript(
	problem: string,
	{ category, id }: Pick<Script, 'category' | 'id'>
): Script {
	console.error(`${problem}. The script will not load.`);

	return { callbackOnly: true, category, id };
};

/**
 * Logs `<helper>: missing or invalid <option>` and returns a script that
 * never loads. See {@link skipScript}.
 *
 * @param helper - Name of the helper, used as the message prefix.
 * @param option - Name of the missing option.
 * @param script - ID and consent category of the script the helper would
 * have returned.
 * @returns A callback-only script without callbacks.
 */
export const skipMissingId = function skipMissingId(
	helper: string,
	option: string,
	script: Pick<Script, 'category' | 'id'>
): Script {
	return skipScript(`${helper}: missing or invalid ${option}`, script);
};
