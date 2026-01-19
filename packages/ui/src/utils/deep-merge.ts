/**
 * Deep merges two objects recursively.
 */
export function deepMerge<T extends Record<string, any>>(
	target: T,
	source: any
): T {
	if (!source || typeof source !== 'object') return target;
	const result = { ...target } as any;
	for (const key in source) {
		if (
			source[key] &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key])
		) {
			result[key] = deepMerge(result[key] || {}, source[key]);
		} else {
			result[key] = source[key];
		}
	}
	return result as T;
}
