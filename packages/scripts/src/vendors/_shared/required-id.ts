/**
 * Validates a required vendor ID option at configuration time.
 *
 * @param helper - Name of the helper, used as the error message prefix.
 * @param option - Name of the option being validated.
 * @param value - Caller-supplied value. Strings are trimmed; finite numbers
 * are converted to strings for callers that pass numeric IDs.
 * @returns The ID without surrounding whitespace.
 * @throws {Error} `<helper>: missing or invalid <option>` when the value is
 * missing, blank, or not a string or finite number.
 *
 * @example
 * ```ts
 * requireId('metaPixel', 'pixelId', ' 123456 '); // '123456'
 * requireId('metaPixel', 'pixelId', ''); // throws
 * ```
 */
export const requireId = function requireId(
	helper: string,
	option: string,
	value: unknown
): string {
	let normalized = '';
	if (typeof value === 'string') {
		normalized = value.trim();
	} else if (typeof value === 'number' && Number.isFinite(value)) {
		normalized = String(value);
	}

	if (normalized.length === 0) {
		throw new Error(`${helper}: missing or invalid ${option}`);
	}

	return normalized;
};
