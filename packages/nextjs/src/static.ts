import {
	createStaticManifestModule as createModule,
	loadStaticManifest as loadManifest,
} from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';

export type { ConsentManifest } from '@c15t/schema/types';
export type {
	StaticConsentResolution,
	StaticConsentResolverOptions,
	StaticGeoResult,
} from '@c15t/core/static';
export {
	createStaticConsentResolver,
	resolveUnknownLocationInit,
} from '@c15t/core/static';

export interface StaticManifestModuleOptions {
	manifestURL: string;
	fetch?: typeof globalThis.fetch;
	exportName?: string;
	/** Package entry that supplies the generated ConsentManifest type. */
	importSource?: string;
}

/** Fetches the manifest used by static builds. */
export const loadStaticManifest = (
	options: Omit<StaticManifestModuleOptions, 'exportName'>
): Promise<ConsentManifest> => loadManifest(options, '@c15t/nextjs/static');

/** Generates a typed manifest module for a static build. */
export const createStaticManifestModule = (
	options: StaticManifestModuleOptions
): Promise<string> =>
	createModule(options, {
		importSource: '@c15t/nextjs/static',
		label: '@c15t/nextjs/static',
	});
