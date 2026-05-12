/**
 * Converts an optional boolean into a string suitable for a script `data-*`
 * attribute.
 *
 * @param value - Optional boolean value from a vendor option.
 * @returns `'true'` or `'false'` when a boolean is provided, otherwise
 * `undefined` so the manifest compiler can omit the attribute.
 *
 * @example
 * ```ts
 * booleanDataAttribute(true); // 'true'
 * booleanDataAttribute(false); // 'false'
 * booleanDataAttribute(undefined); // undefined
 * ```
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
 * Converts a string or string list into a script `data-*` attribute value.
 *
 * Arrays are JSON-serialized so values containing commas can be round-tripped
 * with `JSON.parse` by consumers that read the attribute.
 *
 * @param value - Optional string value or string list from a vendor option.
 * @returns The original string, a JSON-serialized array, or `undefined` so the
 * manifest compiler can omit the attribute.
 *
 * @example
 * ```ts
 * listDataAttribute('example.com'); // 'example.com'
 * listDataAttribute(['a.com', 'b.com']); // '["a.com","b.com"]'
 * listDataAttribute([]); // undefined
 * listDataAttribute(undefined); // undefined
 * ```
 */
export function listDataAttribute(
	value: string[] | string | undefined
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return undefined;
		}

		return JSON.stringify(value);
	}

	return value;
}
