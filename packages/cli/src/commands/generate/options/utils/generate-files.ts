import path from 'node:path';

import type * as p from '@clack/prompts';
import color from 'picocolors';

import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';

import {
	ensureTailwind3PostcssPlugin,
	isTailwindV3,
	tailwind3CreateReactAppWarning,
	tailwind3PostcssInstruction,
	tailwind3PostcssPluginName,
} from '../../../shared/postcss-config';
import { formatSearchedCssPaths } from '../../../shared/stylesheets';
import type { ExpandedTheme, UIStyle } from '../../prompts';
import { generateClientConfigContent } from '../../templates/config';
import {
	resolveStylesheetPackageName,
	updateAppStylesheetImports,
} from '../../templates/css';
import { updateReactLayout } from '../../templates/layout';
import { updateNextConfig } from '../../templates/next-config';
import {
	createFile,
	readFile,
	collectFileEdits,
	applyFileEdits,
} from '../../templates/shared/file-plan';
import type { FileEdit } from '../../templates/shared/file-plan';
import { createProjectPathResolver } from '../../templates/shared/project-paths';
import type { BaseOptions } from '../types';

export type GenerateMode =
	| 'hosted'
	| 'c15t'
	| 'self-hosted'
	| 'offline'
	| 'custom';

export interface GenerateFilesOptions extends BaseOptions {
	context: CliContext;
	signal?: AbortSignal;
	mode: GenerateMode;
	proxyNextjs?: boolean;
	backendURL?: string;
	enableSSR?: boolean;
	enableDevTools?: boolean;
	uiStyle?: UIStyle;
	expandedTheme?: ExpandedTheme;
	selectedScripts?: string[];
}

export interface GenerateFilesResult {
	edits?: FileEdit[];
	configContent?: string;
	configPath?: string | null;
	layoutUpdated: boolean;
	layoutPath?: string | null;
	nextConfigUpdated?: boolean;
	nextConfigPath?: string | null;
	nextConfigCreated?: boolean;
	tailwindCssUpdated?: boolean;
	tailwindCssPath?: string | null;
	postcssConfigUpdated?: boolean;
	postcssConfigPath?: string | null;
	/** Setup steps the CLI could not do, for the user to do by hand. */
	warnings?: string[];
}

interface LayoutUpdateResult {
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: {
		consentManager: string;
		consentManagerClient?: string;
		consentManagerDir?: string;
	};
}

/**
 * Handles the React layout file updates
 * @param options - Configuration options for React layout handling
 * @returns Object containing layout update status and path
 */
const handleReactLayout = async function handleReactLayout(options: {
	developmentEnvironment?: CliContext['framework']['developmentEnvironment'];
	projectRoot: string;
	mode: GenerateMode;
	backendURL?: string;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
	enableSSR?: boolean;
	enableDevTools?: boolean;
	uiStyle?: UIStyle;
	expandedTheme?: ExpandedTheme;
	selectedScripts?: string[];
	spinner: ReturnType<typeof p.spinner>;
	cwd: string;
}): Promise<{ layoutUpdated: boolean; layoutPath: string | null }> {
	const {
		projectRoot,
		mode,
		backendURL,
		proxyNextjs,
		enableSSR,
		enableDevTools,
		uiStyle,
		expandedTheme,
		selectedScripts,
		pkg,
		spinner,
		cwd,
	} = options;
	spinner.start('Updating layout file...');
	const layoutResult = await updateReactLayout({
		backendURL,
		developmentEnvironment: options.developmentEnvironment,
		enableDevTools,
		enableSSR,
		expandedTheme,
		mode,
		pkg,
		projectRoot,
		proxyNextjs,
		selectedScripts,
		uiStyle,
	});

	const spinnerMessage = () => {
		if (layoutResult.alreadyModified) {
			return {
				message:
					'ConsentManager is already imported. Skipped layout file update.',
				type: 'info',
			};
		}
		if (layoutResult.updated) {
			// Check if component files were created (Next.js)
			const typedResult = layoutResult as LayoutUpdateResult;
			if (typedResult.componentFiles) {
				const relativeConsentManager = path.relative(
					cwd,
					typedResult.componentFiles.consentManager
				);
				const relativeLayout = path.relative(cwd, layoutResult.filePath || '');

				// Expanded mode has directory, App Directory has 2 files, Pages Directory has 1 file
				if (typedResult.componentFiles.consentManagerDir) {
					const relativeConsentManagerDir = path.relative(
						cwd,
						typedResult.componentFiles.consentManagerDir
					);
					return {
						message: `Layout setup complete!\n  ${color.green('✓')} Created: ${color.cyan(`${relativeConsentManagerDir}/`)} (expanded components)\n  ${color.green('✓')} Created: ${color.cyan(relativeConsentManager)}\n  ${color.green('✓')} Updated: ${color.cyan(relativeLayout)}`,
						type: 'info',
					};
				}
				if (typedResult.componentFiles.consentManagerClient) {
					const relativeConsentManagerClient = path.relative(
						cwd,
						typedResult.componentFiles.consentManagerClient
					);
					return {
						message: `Layout setup complete!\n  ${color.green('✓')} Created: ${color.cyan(relativeConsentManager)}\n  ${color.green('✓')} Created: ${color.cyan(relativeConsentManagerClient)}\n  ${color.green('✓')} Updated: ${color.cyan(relativeLayout)}`,
						type: 'info',
					};
				}
				return {
					message: `Layout setup complete!\n  ${color.green('✓')} Created: ${color.cyan(relativeConsentManager)}\n  ${color.green('✓')} Updated: ${color.cyan(relativeLayout)}`,
					type: 'info',
				};
			}
			return {
				message: `Layout file updated: ${layoutResult.filePath}`,
				type: 'info',
			};
		}
		return {
			message: 'Layout file not updated.',
			type: 'error',
		};
	};

	const { message, type } = spinnerMessage();
	spinner.stop(formatLogMessage(type, message));

	return {
		layoutPath: layoutResult.filePath,
		layoutUpdated: layoutResult.updated,
	};
};

/**
 * Handles the Next.js config file updates
 * @param options - Configuration options for Next.js config handling
 * @returns Object containing config update status and path
 */
const handleNextConfig = async function handleNextConfig(options: {
	projectRoot: string;
	backendURL?: string;
	spinner: ReturnType<typeof p.spinner>;
}): Promise<{
	nextConfigUpdated: boolean;
	nextConfigPath: string | null;
	nextConfigCreated: boolean;
}> {
	const { projectRoot, backendURL, spinner } = options;
	spinner.start('Updating Next.js config...');

	const configResult = await updateNextConfig({
		backendURL,
		projectRoot,
	});

	const spinnerMessage = () => {
		if (configResult.alreadyModified) {
			return {
				message:
					'Next.js config already has c15t rewrite rule. Skipped config update.',
				type: 'info',
			};
		}
		if (configResult.updated && configResult.created) {
			return {
				message: `Next.js config created: ${configResult.filePath}`,
				type: 'info',
			};
		}
		if (configResult.updated) {
			return {
				message: `Next.js config updated: ${configResult.filePath}`,
				type: 'info',
			};
		}
		return {
			message: 'Next.js config not updated.',
			type: 'error',
		};
	};

	const { message, type } = spinnerMessage();
	spinner.stop(formatLogMessage(type, message));

	return {
		nextConfigCreated: configResult.created,
		nextConfigPath: configResult.filePath,
		nextConfigUpdated: configResult.updated,
	};
};

/**
 * Add the installed package's `postcss-tailwind3` plugin (for example
 * `c15t/postcss-tailwind3`) to a Tailwind 3 app's PostCSS config, or tell the
 * user how when the config can't be edited.
 */
const configureTailwind3Postcss = async function configureTailwind3Postcss({
	cwd,
	pkg,
	projectRoot,
	spinner,
}: {
	cwd: string;
	pkg: 'c15t/next' | 'c15t/react';
	projectRoot: string;
	spinner: ReturnType<typeof p.spinner>;
}): Promise<
	Pick<
		GenerateFilesResult,
		'postcssConfigPath' | 'postcssConfigUpdated' | 'warnings'
	>
> {
	spinner.start('Configuring PostCSS for Tailwind 3...');
	// The plugin comes from the package the app imports c15t from: `c15t`, or
	// `@c15t/react` / `@c15t/nextjs` in apps that installed those directly.
	const pluginName = tailwind3PostcssPluginName(
		await resolveStylesheetPackageName(projectRoot, pkg)
	);
	const postcssResult = await ensureTailwind3PostcssPlugin({
		pluginName,
		projectRoot,
	});
	const result: Pick<
		GenerateFilesResult,
		'postcssConfigPath' | 'postcssConfigUpdated' | 'warnings'
	> = {
		postcssConfigPath: postcssResult.filePath,
		postcssConfigUpdated: postcssResult.status === 'added',
	};

	if (postcssResult.status === 'added') {
		spinner.stop(
			formatLogMessage(
				'info',
				`PostCSS config updated: ${color.cyan(path.relative(cwd, postcssResult.filePath))}`
			)
		);
	} else if (postcssResult.status === 'present') {
		spinner.stop(
			formatLogMessage(
				'debug',
				'PostCSS config already runs the c15t Tailwind 3 plugin.'
			)
		);
	} else {
		const warning =
			postcssResult.status === 'config-ignored'
				? tailwind3CreateReactAppWarning(pluginName)
				: tailwind3PostcssInstruction(pluginName);
		spinner.stop(formatLogMessage('warn', warning));
		result.warnings = [warning];
	}

	return result;
};

/**
 * Generates appropriate files based on the package type and mode
 *
 * @param options - Configuration options for file generation
 * @returns Information about generated/updated files
 */
const generateFilesContent = async function generateFilesContent({
	context,
	mode,
	spinner,
	proxyNextjs,
	backendURL,
	enableSSR,
	enableDevTools,
	uiStyle,
	expandedTheme,
	selectedScripts,
}: GenerateFilesOptions): Promise<GenerateFilesResult> {
	if (context.framework.manualSetupUrl) {
		throw new Error(
			`${context.framework.framework} requires manual integration: ${context.framework.manualSetupUrl}`
		);
	}
	const result: GenerateFilesResult = {
		layoutUpdated: false,
	};

	const {
		projectRoot,
		framework: { pkg },
	} = context;

	if (pkg === 'c15t/next' || pkg === 'c15t/react') {
		const layoutResult = await handleReactLayout({
			backendURL,
			cwd: context.cwd,
			developmentEnvironment: context.framework.developmentEnvironment,
			enableDevTools,
			enableSSR,
			expandedTheme,
			mode,
			pkg,
			projectRoot,
			proxyNextjs,
			selectedScripts,
			spinner,
			uiStyle,
		});
		if (!layoutResult.layoutPath) {
			throw new Error(
				`Could not find the application entrypoint. Follow https://c15t.com/docs/frameworks/${pkg === 'c15t/next' ? 'next' : 'react'}/quickstart`
			);
		}
		result.layoutUpdated = layoutResult.layoutUpdated;
		result.layoutPath = layoutResult.layoutPath;
	}

	// Update Next.js config for hosted/self-hosted Next.js projects only
	if (
		pkg === 'c15t/next' &&
		proxyNextjs &&
		(mode === 'hosted' || mode === 'c15t' || mode === 'self-hosted')
	) {
		const configResult = await handleNextConfig({
			backendURL,
			projectRoot,
			spinner,
		});
		result.nextConfigUpdated = configResult.nextConfigUpdated;
		result.nextConfigPath = configResult.nextConfigPath;
		result.nextConfigCreated = configResult.nextConfigCreated;
	}

	if (pkg === 'c15t') {
		spinner.start('Generating client configuration file...');
		result.configContent = generateClientConfigContent(
			mode,
			backendURL,
			enableDevTools,
			selectedScripts
		);
		result.configPath = path.join(projectRoot, 'c15t.config.ts');
		await createFile(result.configPath, result.configContent, 'utf-8');
		spinner.stop(
			formatLogMessage(
				'info',
				`Client configuration file generated: ${result.configPath}`
			)
		);
	}

	if (pkg === 'c15t/react' || pkg === 'c15t/next') {
		spinner.start('Configuring app stylesheet...');
		const stylesheetResult = await updateAppStylesheetImports({
			entrypointPath: result.layoutPath,
			packageName: pkg,
			projectRoot,
		});
		if (stylesheetResult.updated) {
			result.tailwindCssUpdated = true;
			result.tailwindCssPath = stylesheetResult.filePath;
			spinner.stop(
				formatLogMessage(
					'info',
					`App stylesheet updated: ${color.cyan(path.relative(context.cwd, stylesheetResult.filePath || ''))}`
				)
			);
		} else if (stylesheetResult.filePath) {
			spinner.stop(
				formatLogMessage(
					'debug',
					'App stylesheet already had the correct c15t imports.'
				)
			);
		} else {
			spinner.stop(
				formatLogMessage(
					'warn',
					`Could not find a global CSS entrypoint. Checked: ${formatSearchedCssPaths(projectRoot, stylesheetResult.searchedPaths)}`
				)
			);
		}

		if (isTailwindV3(context.framework.tailwindVersion)) {
			Object.assign(
				result,
				await configureTailwind3Postcss({
					cwd: context.cwd,
					pkg,
					projectRoot,
					spinner,
				})
			);
		}
	}

	return result;
};

/** Produces reviewable file edits without mutating the project. */
export const planGenerateFiles = async function planGenerateFiles(
	options: GenerateFilesOptions
): Promise<GenerateFilesResult & { edits: FileEdit[] }> {
	const resolvePath = await createProjectPathResolver(
		options.context.projectRoot
	);
	const manifest = JSON.parse(
		await readFile(
			await resolvePath(path.join(options.context.projectRoot, 'package.json')),
			'utf-8'
		)
	);
	const { result, edits } = await collectFileEdits(
		() => generateFilesContent(options),
		{ projectRoot: options.context.projectRoot }
	);
	const dependencies = {
		...manifest.dependencies,
		...manifest.devDependencies,
	};
	if (!dependencies.c15t) {
		for (const [umbrella, scoped] of [
			['c15t/react', '@c15t/react'],
			['c15t/next', '@c15t/nextjs'],
		]) {
			if (!umbrella || !scoped || !dependencies[scoped]) {
				continue;
			}
			for (const edit of edits) {
				edit.after = edit.after
					.replaceAll(`'${umbrella}`, `'${scoped}`)
					.replaceAll(`"${umbrella}`, `"${scoped}`);
			}
		}
	}
	return { ...result, edits };
};

/** Generates the files as one transaction, with complete rollback on failure. */
export const generateFiles = async function generateFiles(
	options: GenerateFilesOptions
): Promise<GenerateFilesResult & { edits: FileEdit[] }> {
	const plan = await planGenerateFiles(options);
	await applyFileEdits(plan.edits, { signal: options.signal });
	return plan;
};
