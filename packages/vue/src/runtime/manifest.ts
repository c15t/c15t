import type { ConsentConfig } from './config';

export const DEFAULT_NUXT_INIT_ROUTE = '/api/c15t/init';
export const DEFAULT_MANIFEST_ROUTE = '/api/c15t/manifest';

export function isManifestModeEnabled(
	config: Partial<Pick<ConsentConfig, 'manifest' | 'manifestURL'>>
): boolean {
	return config.manifest === true || Boolean(config.manifestURL);
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
