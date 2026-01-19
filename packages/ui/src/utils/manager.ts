import type { StorageConfig } from 'c15t';

export interface CacheKeyOptions {
	mode: string;
	backendURL: string | undefined;
	endpointHandlers: unknown;
	storageConfig: StorageConfig | undefined;
	defaultLanguage: string | undefined;
	enabled: boolean | undefined;
}

/**
 * Generates a stable cache key based on critical configuration options.
 */
export function generateCacheKey({
	mode,
	backendURL,
	endpointHandlers,
	storageConfig,
	defaultLanguage,
	enabled,
}: CacheKeyOptions): string {
	const enabledKey = enabled === false ? 'disabled' : 'enabled';
	return `${mode}:${backendURL ?? 'default'}:${endpointHandlers ? 'custom' : 'none'}:${storageConfig?.storageKey ?? 'default'}:${defaultLanguage ?? 'default'}:${enabledKey}`;
}

/**
 * Registry for persisting stores and managers across framework lifecycles.
 */
export class ManagerRegistry<T = any> {
	private cache = new Map<string, T>();

	get(key: string): T | undefined {
		return this.cache.get(key);
	}

	set(key: string, value: T): void {
		this.cache.set(key, value);
	}

	clear(): void {
		this.cache.clear();
	}
}
