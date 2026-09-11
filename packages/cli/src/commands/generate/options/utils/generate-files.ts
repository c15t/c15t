import path from 'node:path';

import type * as p from '@clack/prompts';
import color from 'picocolors';

import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';

import { formatSearchedCssPaths } from '../../../shared/stylesheets';
import type { ExpandedTheme, UIStyle } from '../../prompts';
import { generateClientConfigContent } from '../../templates/config';
import { updateAppStylesheetImports } from '../../templates/css';
import {
	generateEnvExampleContent,
	generateEnvFileContent,
	getEnvVarName,
} from '../../templates/env';
import { updateReactLayout } from '../../templates/layout';
import { updateNextConfig } from '../../templates/next-config';
import fs, {
	createFile,
	readFile,
	writeFile,
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
	useEnvFile?: boolean;
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
	useEnvFile?: boolean;
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
		useEnvFile,
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
		useEnvFile,
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
	useEnvFile?: boolean;
	spinner: ReturnType<typeof p.spinner>;
}): Promise<{
	nextConfigUpdated: boolean;
	nextConfigPath: string | null;
	nextConfigCreated: boolean;
}> {
	const { projectRoot, backendURL, useEnvFile, spinner } = options;
	spinner.start('Updating Next.js config...');

	const configResult = await updateNextConfig({
		backendURL,
		projectRoot,
		useEnvFile,
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
 * Handles the creation and updating of environment files
 * @param options - Configuration options for environment file handling
 */
const handleEnvFiles = async function handleEnvFiles(options: {
	developmentEnvironment?: CliContext['framework']['developmentEnvironment'];
	projectRoot: string;
	backendURL: string;
	pkg: AvailablePackages;
	spinner: ReturnType<typeof p.spinner>;
	cwd: string;
}): Promise<void> {
	const { projectRoot, backendURL, pkg, spinner, cwd } = options;
	const envPath = path.join(projectRoot, '.env.local');
	const envExamplePath = path.join(projectRoot, '.env.example');

	spinner.start('Creating/updating environment files...');

	const envContent = generateEnvFileContent(
		backendURL,
		pkg,
		options.developmentEnvironment
	);
	const envExampleContent = generateEnvExampleContent(
		pkg,
		options.developmentEnvironment
	);
	const envVarName = getEnvVarName(pkg, options.developmentEnvironment);

	try {
		const [envExists, envExampleExists] = await Promise.all([
			fs
				.access(envPath)
				.then(() => true)
				.catch(() => false),
			fs
				.access(envExamplePath)
				.then(() => true)
				.catch(() => false),
		]);

		if (envExists) {
			const currentEnvContent = await readFile(envPath, 'utf-8');
			if (!currentEnvContent.includes(envVarName)) {
				await fs.appendFile(envPath, envContent);
			}
		} else {
			await writeFile(envPath, envContent);
		}

		if (envExampleExists) {
			const currentExampleContent = await readFile(envExamplePath, 'utf-8');
			if (!currentExampleContent.includes(envVarName)) {
				await fs.appendFile(envExamplePath, envExampleContent);
			}
		} else {
			await writeFile(envExamplePath, envExampleContent);
		}

		spinner.stop(
			formatLogMessage(
				'info',
				`Environment files added/updated successfully: ${color.cyan(path.relative(cwd, envPath))} and ${color.cyan(path.relative(cwd, envExamplePath))}`
			)
		);
	} catch (error: unknown) {
		spinner.stop(
			formatLogMessage(
				'error',
				`Error processing environment files: ${error instanceof Error ? error.message : String(error)}`
			)
		);
		throw error;
	}
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
	useEnvFile,
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
			useEnvFile,
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
			useEnvFile,
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
			useEnvFile,
			enableDevTools,
			context.framework.developmentEnvironment,
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

	if (useEnvFile && backendURL) {
		await handleEnvFiles({
			backendURL,
			cwd: context.cwd,
			developmentEnvironment: context.framework.developmentEnvironment,
			pkg,
			projectRoot,
			spinner,
		});
	}

	if (pkg === 'c15t/react' || pkg === 'c15t/next') {
		spinner.start('Configuring app stylesheet...');
		const stylesheetResult = await updateAppStylesheetImports({
			entrypointPath: result.layoutPath,
			packageName: pkg,
			projectRoot,
			tailwindVersion: context.framework.tailwindVersion,
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
