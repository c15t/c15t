import type { PolicyUiSurfaceConfig } from './policy-runtime';

export function dedupeDefinedValues<T>(
	values?: readonly T[] | null
): T[] | undefined {
	if (!values || values.length === 0) {
		return undefined;
	}

	return [...new Set(values)];
}

export function dedupeTrimmedStrings(
	values?: readonly string[] | null
): string[] | undefined {
	if (!values || values.length === 0) {
		return undefined;
	}

	const normalized = [
		...new Set(values.map((value) => value.trim()).filter(Boolean)),
	];
	return normalized.length > 0 ? normalized : undefined;
}

export function compactDefined<T extends Record<string, unknown>>(
	value: T
): T | undefined {
	const entries = Object.entries(value).filter(
		([, field]) => field !== undefined
	);
	if (entries.length === 0) {
		return undefined;
	}

	return Object.fromEntries(entries) as T;
}

export function hasRealPolicyUiHints(
	surface?: PolicyUiSurfaceConfig | null
): boolean {
	if (!surface) {
		return false;
	}

	return Object.values(surface).some((value) => {
		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return value !== undefined;
	});
}
