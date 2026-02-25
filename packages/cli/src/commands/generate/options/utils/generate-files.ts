import fs from 'node:fs/promises';
import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';
import type { ExpandedTheme, UIStyle } from '../../prompts';
import { generateClientConfigContent } from '../../templates/config';
import { updateTailwindCss } from '../../templates/css';
import {
	generateEnvExampleContent,
	generateEnvFileContent,
	getEnvVarName,
} from '../../templates/env';
import { updateReactLayout } from '../../templates/layout';
import { updateNextConfig } from '../../templates/next-config';
import type { BaseOptions } from '../types';

export type GenerateMode =
	| 'hosted'
	| 'c15t'
	| 'self-hosted'
	| 'offline'
	| 'custom';

export interface GenerateFilesOptions extends BaseOptions {
	context: CliContext;
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
async function handleReactLayout(options: {
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
		layoutUpdated: layoutResult.updated,
		layoutPath: layoutResult.filePath,
	};
}

/**
 * Handles the Next.js config file updates
 * @param options - Configuration options for Next.js config handling
 * @returns Object containing config update status and path
 */
async function handleNextConfig(options: {
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
		projectRoot,
		backendURL,
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
		nextConfigUpdated: configResult.updated,
		nextConfigPath: configResult.filePath,
		nextConfigCreated: configResult.created,
	};
}

/**
 * Handles the creation and updating of environment files
 * @param options - Configuration options for environment file handling
 */
async function handleEnvFiles(options: {
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

	const envContent = generateEnvFileContent(backendURL, pkg);
	const envExampleContent = generateEnvExampleContent(pkg);
	const envVarName = getEnvVarName(pkg);

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
			const currentEnvContent = await fs.readFile(envPath, 'utf-8');
			if (!currentEnvContent.includes(envVarName)) {
				await fs.appendFile(envPath, envContent);
			}
		} else {
			await fs.writeFile(envPath, envContent);
		}

		if (envExampleExists) {
			const currentExampleContent = await fs.readFile(envExamplePath, 'utf-8');
			if (!currentExampleContent.includes(envVarName)) {
				await fs.appendFile(envExamplePath, envExampleContent);
			}
		} else {
			await fs.writeFile(envExamplePath, envExampleContent);
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
}

/**
 * Generates appropriate files based on the package type and mode
 *
 * @param options - Configuration options for file generation
 * @returns Information about generated/updated files
 */
export async function generateFiles({
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
	const result: GenerateFilesResult = {
		layoutUpdated: false,
	};

	const {
		projectRoot,
		framework: { pkg },
	} = context;

	if (pkg === '@c15t/nextjs' || pkg === '@c15t/react') {
		const layoutResult = await handleReactLayout({
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
			cwd: context.cwd,
		});
		result.layoutUpdated = layoutResult.layoutUpdated;
		result.layoutPath = layoutResult.layoutPath;
	}

	// Update Next.js config for hosted/self-hosted Next.js projects only
	if (
		pkg === '@c15t/nextjs' &&
		proxyNextjs &&
		(mode === 'hosted' || mode === 'c15t' || mode === 'self-hosted')
	) {
		const configResult = await handleNextConfig({
			projectRoot,
			backendURL,
			useEnvFile,
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
			useEnvFile,
			enableDevTools
		);
		result.configPath = path.join(projectRoot, 'c15t.config.ts');
		spinner.stop(
			formatLogMessage(
				'info',
				`Client configuration file generated: ${result.configContent}`
			)
		);
	}

	if (useEnvFile && backendURL) {
		await handleEnvFiles({
			projectRoot,
			backendURL,
			pkg,
			spinner,
			cwd: context.cwd,
		});
	}

	// Update Tailwind CSS if needed (v3 detection)
	if (context.framework.tailwindVersion) {
		spinner.start('Checking Tailwind CSS compatibility...');
		const tailwindResult = await updateTailwindCss(
			projectRoot,
			context.framework.tailwindVersion
		);
		if (tailwindResult.updated) {
			result.tailwindCssUpdated = true;
			result.tailwindCssPath = tailwindResult.filePath;
			spinner.stop(
				formatLogMessage(
					'info',
					`Tailwind CSS updated for v3 compatibility: ${color.cyan(path.relative(context.cwd, tailwindResult.filePath || ''))}`
				)
			);
		} else {
			spinner.stop(
				formatLogMessage('debug', 'Tailwind CSS update not needed.')
			);
		}
	}

	return result;
}
