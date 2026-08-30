import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { UMBRELLA_PACKAGE } from '~/constants';

import {
	type EnsureGlobalCssStylesheetImportsResult,
	ensureGlobalCssStylesheetImports,
	type StyledPackageName,
} from '../../shared/stylesheets';

export interface UpdateAppStylesheetImportsOptions {
	projectRoot: string;
	packageName: Exclude<StyledPackageName, '@c15t/ui'>;
	tailwindVersion: string | null;
	entrypointPath?: string | null;
	dryRun?: boolean;
	includeIab?: boolean;
}

const SCOPED_STYLESHEET_PACKAGES = {
	'c15t/react': '@c15t/react',
	'c15t/next': '@c15t/nextjs',
} as const;

/**
 * Resolve which package's stylesheet imports the app should end up with.
 *
 * Apps that installed a scoped framework package (`@c15t/react`,
 * `@c15t/nextjs`) directly — without the `c15t` umbrella — keep scoped
 * stylesheet imports. Normalizing their CSS to umbrella paths would mix
 * umbrella CSS with scoped JS, a version-skew hazard. The scoped-to-umbrella
 * normalization only applies when the app actually depends on the umbrella.
 *
 * @param projectRoot - App root containing package.json
 * @param packageName - The umbrella entry point requested by the caller
 * @returns The scoped package name for scoped-only apps, otherwise the
 * requested package name
 */
async function resolveStylesheetPackageName(
	projectRoot: string,
	packageName: UpdateAppStylesheetImportsOptions['packageName']
): Promise<UpdateAppStylesheetImportsOptions['packageName']> {
	if (!(packageName in SCOPED_STYLESHEET_PACKAGES)) {
		return packageName;
	}

	const scopedPackage =
		SCOPED_STYLESHEET_PACKAGES[
			packageName as keyof typeof SCOPED_STYLESHEET_PACKAGES
		];

	try {
		const packageJson = JSON.parse(
			await readFile(join(projectRoot, 'package.json'), 'utf-8')
		);
		const allDeps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		if (!(UMBRELLA_PACKAGE in allDeps) && scopedPackage in allDeps) {
			return scopedPackage;
		}
	} catch {
		// No readable manifest — keep the requested umbrella entry point.
	}

	return packageName;
}

export async function updateAppStylesheetImports(
	options: UpdateAppStylesheetImportsOptions
): Promise<EnsureGlobalCssStylesheetImportsResult> {
	const packageName = await resolveStylesheetPackageName(
		options.projectRoot,
		options.packageName
	);

	return ensureGlobalCssStylesheetImports({
		projectRoot: options.projectRoot,
		packageName,
		tailwindVersion: options.tailwindVersion,
		entrypointPath: options.entrypointPath,
		includeBase: true,
		includeIab: options.includeIab ?? false,
		dryRun: options.dryRun,
	});
}
