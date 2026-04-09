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

export async function updateAppStylesheetImports(
	options: UpdateAppStylesheetImportsOptions
): Promise<EnsureGlobalCssStylesheetImportsResult> {
	return ensureGlobalCssStylesheetImports({
		projectRoot: options.projectRoot,
		packageName: options.packageName,
		tailwindVersion: options.tailwindVersion,
		entrypointPath: options.entrypointPath,
		includeBase: true,
		includeIab: options.includeIab ?? false,
		dryRun: options.dryRun,
	});
}
