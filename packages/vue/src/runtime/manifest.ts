import type { ConsentConfig } from './config';

export const DEFAULT_NUXT_INIT_ROUTE = '/api/c15t/init';
export const DEFAULT_MANIFEST_ROUTE = '/api/c15t/manifest';

export type ResolvedManifestMode = 'client' | 'server' | false;

export function resolveManifestMode(
	config: Partial<Pick<ConsentConfig, 'manifest' | 'manifestURL'>>
): ResolvedManifestMode {
	if (config.manifest === false) {
		return false;
	}
	if (config.manifest === 'client') {
		return 'client';
	}
	if (config.manifest === 'server' || config.manifest === true) {
		return 'server';
	}
	return config.manifestURL ? 'server' : false;
}

export function isManifestModeEnabled(
	config: Partial<Pick<ConsentConfig, 'manifest' | 'manifestURL'>>
): boolean {
	return resolveManifestMode(config) !== false;
}

export function isClientManifestModeEnabled(
	config: Partial<Pick<ConsentConfig, 'manifest' | 'manifestURL'>>
): boolean {
	return resolveManifestMode(config) === 'client';
}

export function isServerManifestModeEnabled(
	config: Partial<Pick<ConsentConfig, 'manifest' | 'manifestURL'>>
): boolean {
	return resolveManifestMode(config) === 'server';
}

export function resolveNuxtInitRoute(
	config: Pick<ConsentConfig, 'initRoute'>
): string {
	return config.initRoute ?? DEFAULT_NUXT_INIT_ROUTE;
}

export function resolveNuxtManifestRoute(
	config: Pick<ConsentConfig, 'manifestRoute'>
): string {
	return config.manifestRoute ?? DEFAULT_MANIFEST_ROUTE;
}

export function resolveClientManifestURL(
	config: Pick<ConsentConfig, 'manifestRoute' | 'manifestURL'>
): string {
	return config.manifestURL ?? resolveNuxtManifestRoute(config);
}
