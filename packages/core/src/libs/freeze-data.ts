/** Freeze owned plain data recursively, reusing already-frozen branches. */
export const deepFreeze = function deepFreeze(value: unknown): void {
	if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
		return;
	}
	Object.freeze(value);
	for (const nested of Object.values(value as Record<string, unknown>)) {
		deepFreeze(nested);
	}
};
