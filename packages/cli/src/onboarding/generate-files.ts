import fs from 'node:fs/promises';
import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';
import type { AvailiblePackages } from './detection';
import { generateClientConfigContent } from './templates/config';
import { generateEnvFileContent } from './templates/env';
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
	const { logger, cwd } = context;

	const result: GenerateFilesResult = {
		layoutUpdated: false,
	};

	// For React-based packages, update the layout file
	if (pkg === '@c15t/nextjs' || pkg === '@c15t/react') {
		spinner.start('Updating layout file...');
		const layoutResult = await updateReactLayout({
			projectRoot,
			mode,
			backendURL,
			useEnvFile,
			pkg,
		});

		if (layoutResult.alreadyModified) {
			spinner.stop(formatLogMessage('info', 'Layout file already modified.'));
			return result;
		}

		result.layoutUpdated = layoutResult.updated;
		result.layoutPath = layoutResult.filePath;

		const spinnerMessage = () => {
			if (layoutResult.alreadyModified) {
				return {
					message: 'Layout file already modified. Skipping...',
					type: 'warn',
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
	}

	// Generate config content for non-react projects
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
		const envPath = path.join(projectRoot, '.env.local');
		const envExamplePath = path.join(projectRoot, '.env.example');

		spinner.start('Creating environment files...');

		const envContent = generateEnvFileContent(backendURL);
		await fs.writeFile(envPath, envContent);
		logger.info(
			`   - Created environment file: ${color.cyan(path.relative(cwd, envPath))}`
		);

		const envExampleContent =
			'# c15t Configuration\nNEXT_PUBLIC_C15T_URL=https://your-instance.c15t.dev\n';
		await fs.writeFile(envExamplePath, envExampleContent);
		logger.info(
			`   - Created example env file: ${color.cyan(path.relative(cwd, envExamplePath))}`
		);

		spinner.stop(formatLogMessage('info', 'Environment files created.'));
	}

	return result;
}
