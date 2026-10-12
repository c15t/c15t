/**
 * Deep merges two objects recursively.
 */
const isIndexableObject = function isIndexableObject(
	value: unknown
): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
};

export const deepMerge = function deepMerge<T extends Record<string, unknown>>(
	target: T,
	source: unknown
): T {
	if (!isIndexableObject(source)) {
		return target;
	}
	const result: Record<string, unknown> = { ...target };
	for (const key in source) {
		if (!Object.hasOwn(source, key)) {
			continue;
		}
		const sourceValue = source[key];
		if (isIndexableObject(sourceValue) && !Array.isArray(sourceValue)) {
			const targetValue = result[key];
			result[key] = deepMerge(
				isIndexableObject(targetValue) && !Array.isArray(targetValue)
					? targetValue
					: {},
				sourceValue
			);
		} else {
			result[key] = sourceValue;
		}
	}
	return { ...target, ...result };
};
