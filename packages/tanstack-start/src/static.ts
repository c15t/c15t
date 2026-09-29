import {
	createStaticManifestModule as createModule,
	loadStaticManifest as loadManifest,
} from '@c15t/core/server';
import { resolveUnknownLocationInit } from '@c15t/core/static';
import type { ConsentManifest } from '@c15t/schema/types';

/** The manifest shape generated static modules are typed against. */
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
	/**
	 * Module the generated file imports its `ConsentManifest` type from.
	 * Use the entry the application itself depends on, so the import
	 * resolves under strict dependency layouts (pnpm): apps that install
	 * the umbrella package pass `'c15t/tanstack-start/static'`.
	 *
	 * @default '@c15t/tanstack-start/static'
	 */
	importSource?: string;
}

/**
 * Resolves the init payload for a visitor whose location is unknown.
 *
 * @deprecated Renamed to {@link resolveUnknownLocationInit}. It returns the
 * manifest's configured unknown-location policy, not the strictest one.
 */
export const resolveStrictestDefaultInit = resolveUnknownLocationInit;

/** Fetches the manifest used by static builds. */
export const loadStaticManifest = (
	options: Omit<StaticManifestModuleOptions, 'exportName'>
): Promise<ConsentManifest> =>
	loadManifest(options, '@c15t/tanstack-start/static');

/** Generates a typed manifest module for a static build. */
export const createStaticManifestModule = (
	options: StaticManifestModuleOptions
): Promise<string> =>
	createModule(options, {
		importSource: '@c15t/tanstack-start/static',
		label: '@c15t/tanstack-start/static',
	});
