/**
 * Converts an optional boolean into a string suitable for a script `data-*`
 * attribute.
 *
 * @param value - Optional boolean value from a vendor option.
 * @returns `'true'` or `'false'` when a boolean is provided, otherwise
 * `undefined` so the manifest compiler can omit the attribute.
 */
export function booleanDataAttribute(
	value: boolean | undefined
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (value) {
		return 'true';
	}

	return 'false';
}

/**
 * Converts a string or string list into a comma-separated script `data-*`
 * attribute value.
 *
 * @param value - Optional string value or string list from a vendor option.
 * @returns The original string, a comma-joined array, or `undefined` so the
 * manifest compiler can omit the attribute.
 */
export function listDataAttribute(
	value: string[] | string | undefined
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (Array.isArray(value)) {
		return value.join(',');
	}

	return value;
}
