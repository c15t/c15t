import type { Script } from 'c15t';
import { compileManifest } from './engine/compile';
import { resolvedManifestToScript } from './engine/runtime';
import type { ResolvedManifest, VendorManifest } from './types';

const manifestCache = new WeakMap<
	VendorManifest,
	Map<string, ResolvedManifest>
>();

function serializeConfigValue(value: unknown): string {
	if (value === undefined) {
		return 'undefined';
	}

	if (value === null) {
		return 'null';
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => serializeConfigValue(item)).join(',')}]`;
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).sort(
			([left], [right]) => left.localeCompare(right)
		);

		return `{${entries
			.map(
				([key, nestedValue]) =>
					`${JSON.stringify(key)}:${serializeConfigValue(nestedValue)}`
			)
			.join(',')}}`;
	}

	return `${typeof value}:${String(value)}`;
}

function getManifestCacheKey(config: Record<string, unknown>): string {
	return serializeConfigValue(config);
}

function getCompiledManifest(
	manifest: VendorManifest,
	config: Record<string, unknown>
): ResolvedManifest {
	const cacheKey = getManifestCacheKey(config);
	let configCache = manifestCache.get(manifest);

	if (!configCache) {
		configCache = new Map<string, ResolvedManifest>();
		manifestCache.set(manifest, configCache);
	}

	const cached = configCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const compiled = compileManifest(manifest, config);
	configCache.set(cacheKey, compiled);

	return compiled;
}

/**
 * Compiles a `VendorManifest` + config into a `Script` object.
 *
 * This compatibility wrapper preserves the existing public resolver API while
 * delegating to the new compile and runtime conversion phases internally.
 */
export function resolveManifest(
	manifest: VendorManifest,
	config: Record<string, unknown> = {}
): Script {
	return resolvedManifestToScript(getCompiledManifest(manifest, config));
}
