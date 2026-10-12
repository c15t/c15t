import { trimToUndefined } from './script-url';

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
export const booleanDataAttribute = function booleanDataAttribute(
	value: boolean | undefined
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (value) {
		return 'true';
	}

	return 'false';
};

/**
 * Converts a string or string list into a comma-separated script `data-*`
 * attribute value, the list format vendor trackers such as Umami and Pirsch
 * split on.
 *
 * @param value - Optional string value or string list from a vendor option.
 * @returns The trimmed string, the trimmed non-empty items joined with commas,
 * or `undefined` when nothing remains so the manifest compiler can omit the
 * attribute.
 *
 * @example
 * ```ts
 * listDataAttribute('example.com'); // 'example.com'
 * listDataAttribute(['a.com', ' b.com ']); // 'a.com,b.com'
 * listDataAttribute([]); // undefined
 * listDataAttribute(undefined); // undefined
 * ```
 */
export const listDataAttribute = function listDataAttribute(
	value: string[] | string | undefined
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (Array.isArray(value)) {
		const items = value
			.map((item) => item.trim())
			.filter((item) => item.length > 0);

		if (items.length === 0) {
			return undefined;
		}

		return items.join(',');
	}

	return trimToUndefined(value);
};
