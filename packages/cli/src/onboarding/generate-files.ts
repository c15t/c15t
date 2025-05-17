import fs from 'node:fs/promises';
import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';
import type { AvailiblePackages } from './detection';
import { generateClientConfigContent } from './templates/config';
import {
	generateEnvExampleContent,
	generateEnvFileContent,
	getEnvVarName,
} from './templates/env';
import { updateReactLayout } from './templates/layout';

export interface GenerateFilesOptions {
	context: CliContext;
	projectRoot: string;
	mode: 'c15t' | 'offline' | 'custom';
	pkg: AvailiblePackages;
	backendURL?: string;
	useEnvFile?: boolean;
	spinner: ReturnType<typeof p.spinner>;
}

export interface GenerateFilesResult {
	configContent?: string;
	configPath?: string | null;
	layoutUpdated: boolean;
	layoutPath?: string | null;
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
	pkg: AvailiblePackages;
	spinner: ReturnType<typeof p.spinner>;
}): Promise<{ layoutUpdated: boolean; layoutPath: string | null }> {
	const { projectRoot, mode, backendURL, useEnvFile, pkg, spinner } = options;
	spinner.start('Updating layout file...');
	const layoutResult = await updateReactLayout({
		projectRoot,
		mode,
		backendURL,
		useEnvFile,
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
 * Handles the creation and updating of environment files
 * @param options - Configuration options for environment file handling
 */
async function handleEnvFiles(options: {
	projectRoot: string;
	backendURL: string;
	pkg: AvailiblePackages;
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
			pkg,
			spinner,
		});
		result.layoutUpdated = layoutResult.layoutUpdated;
		result.layoutPath = layoutResult.layoutPath;
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
