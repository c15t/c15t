export const dedupeDefinedValues = function dedupeDefinedValues<T>(
	values?: readonly T[] | null
): T[] | undefined {
	if (!values || values.length === 0) {
		return undefined;
	}

	return [...new Set(values)];
};

export const dedupeTrimmedStrings = function dedupeTrimmedStrings(
	values?: readonly string[] | null
): string[] | undefined {
	if (!values || values.length === 0) {
		return undefined;
	}

	const normalized = [
		...new Set(values.map((value) => value.trim()).filter(Boolean)),
	];
	return normalized.length > 0 ? normalized : undefined;
};

export const compactDefined = function compactDefined<
	T extends Record<string, unknown>,
>(value: T): T | undefined {
	const entries = Object.entries(value).filter(
		([, field]) => field !== undefined
	);
	if (entries.length === 0) {
		return undefined;
	}

	return Object.fromEntries(entries) as T;
};
