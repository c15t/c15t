import fs from 'node:fs/promises';
import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';
import { generateClientConfigContent } from './templates/config';
import {
	generateEnvExampleContent,
	generateEnvFileContent,
	getEnvVarName,
} from './templates/env';
import { updateReactLayout } from './templates/layout';
import { updateNextConfig } from './templates/next-config';

export interface GenerateFilesOptions {
	context: CliContext;
	projectRoot: string;
	mode: 'c15t' | 'offline' | 'custom';
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
	backendURL?: string;
	useEnvFile?: boolean;
	spinner: ReturnType<typeof p.spinner>;
}

export interface GenerateFilesResult {
	configContent?: string;
	configPath?: string | null;
	layoutUpdated: boolean;
	layoutPath?: string | null;
	nextConfigUpdated?: boolean;
	nextConfigPath?: string | null;
	nextConfigCreated?: boolean;
}

/**
 * Handles the React layout file updates
 * @param options - Configuration options for React layout handling
 * @returns Object containing layout update status and path
 */
async function handleReactLayout(options: {
	projectRoot: string;
	mode: 'c15t' | 'offline' | 'custom';
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
	spinner: ReturnType<typeof p.spinner>;
}): Promise<{ layoutUpdated: boolean; layoutPath: string | null }> {
	const {
		projectRoot,
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		pkg,
		spinner,
	} = options;
	spinner.start('Updating layout file...');
	const layoutResult = await updateReactLayout({
		projectRoot,
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		pkg,
	});

	const spinnerMessage = () => {
		if (layoutResult.alreadyModified) {
			return {
				message:
					'ConsentManagerProvider is already imported. Skipped layout file update.',
				type: 'info',
			};
		}
		if (layoutResult.updated) {
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
	projectRoot,
	mode,
	pkg,
	backendURL,
	spinner,
	useEnvFile,
	proxyNextjs,
}: GenerateFilesOptions): Promise<GenerateFilesResult> {
	const result: GenerateFilesResult = {
		layoutUpdated: false,
	};

	if (pkg === '@c15t/nextjs' || pkg === '@c15t/react') {
		const layoutResult = await handleReactLayout({
			projectRoot,
			mode,
			backendURL,
			useEnvFile,
			proxyNextjs,
			pkg,
			spinner,
		});
		result.layoutUpdated = layoutResult.layoutUpdated;
		result.layoutPath = layoutResult.layoutPath;
	}

	// Update Next.js config for c15t Next.js projects only
	if (pkg === '@c15t/nextjs' && proxyNextjs && mode === 'c15t') {
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
			useEnvFile
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

	return result;
}
