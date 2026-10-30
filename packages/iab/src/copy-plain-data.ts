/**
 * Deep copy of plain data: arrays, plain objects, dates and primitives.
 *
 * Use this instead of `structuredClone`, which browsers only ship from
 * Chrome 98, Firefox 94 and Safari 15.4. Values are assumed to be acyclic.
 * Other objects are copied as plain objects of their own enumerable fields.
 *
 * @param value - The value to copy.
 * @returns A copy that shares no objects with `value`.
 */
export const copyPlainData = function copyPlainData<Value>(
	value: Value
): Value {
	if (typeof value !== 'object' || value === null) {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(copyPlainData) as Value;
	}
	if (value instanceof Date) {
		return new Date(value) as Value;
	}
	// `fromEntries` defines each key, so an own `__proto__` field stays data.
	return Object.fromEntries(
		Object.entries(value).map(([key, nested]) => [key, copyPlainData(nested)])
	) as Value;
};
