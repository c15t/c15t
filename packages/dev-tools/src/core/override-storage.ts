import type { ConsentStoreState } from '@c15t/core';

const DEVTOOLS_OVERRIDES_STORAGE_KEY = 'c15t-devtools-overrides';

export type PersistedDevToolsOverrides = Pick<
	NonNullable<ConsentStoreState['overrides']>,
	'country' | 'region' | 'language' | 'gpc'
>;

const normalizeStringValue = function normalizeStringValue(
	value: unknown
): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
};

const normalizeBooleanValue = function normalizeBooleanValue(
	value: unknown
): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
};

export const hasPersistedOverrides = function hasPersistedOverrides(
	overrides: PersistedDevToolsOverrides
): boolean {
	return Boolean(
		overrides.country ||
		overrides.region ||
		overrides.language ||
		overrides.gpc !== undefined
	);
};

const normalizeOverrides = function normalizeOverrides(
	value: unknown
): PersistedDevToolsOverrides | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const source = value as Record<string, unknown>;
	const overrides: PersistedDevToolsOverrides = {
		country: normalizeStringValue(source.country),
		gpc: normalizeBooleanValue(source.gpc),
		language: normalizeStringValue(source.language),
		region: normalizeStringValue(source.region),
	};

	return hasPersistedOverrides(overrides) ? overrides : null;
};

export const loadPersistedOverrides = function loadPersistedOverrides(
	storageKey = DEVTOOLS_OVERRIDES_STORAGE_KEY
): PersistedDevToolsOverrides | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const stored = localStorage.getItem(storageKey);
		if (!stored) {
			return null;
		}

		const parsed = JSON.parse(stored) as unknown;
		return normalizeOverrides(parsed);
	} catch {
		return null;
	}
};

export const persistOverrides = function persistOverrides(
	overrides: PersistedDevToolsOverrides,
	storageKey = DEVTOOLS_OVERRIDES_STORAGE_KEY
): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		if (!hasPersistedOverrides(overrides)) {
			localStorage.removeItem(storageKey);
			return;
		}

		localStorage.setItem(storageKey, JSON.stringify(overrides));
	} catch {
		// Silently fail if localStorage is unavailable
	}
};

export const clearPersistedOverrides = function clearPersistedOverrides(
	storageKey = DEVTOOLS_OVERRIDES_STORAGE_KEY
): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		localStorage.removeItem(storageKey);
	} catch {
		// Silently fail if localStorage is unavailable
	}
};
