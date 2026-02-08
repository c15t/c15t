/**
 * File generation actor for the generate state machine
 *
 * Handles file creation and modification with backup support for rollback.
 */

import path from 'node:path';
import { fromPromise } from 'xstate';
import type { StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
import type { FileModification } from '../../types';
import type { ExpandedTheme, UIStyle } from '../types';

/**
 * Input for the file generation actor
 */
export interface FileGenerationInput {
	cliContext: CliContext;
	mode: StorageMode;
	backendURL: string | null;
	useEnvFile: boolean;
	proxyNextjs: boolean;
	enableSSR: boolean;
	enableDevTools: boolean;
	uiStyle: UIStyle;
	expandedTheme: ExpandedTheme | null;
	selectedScripts: string[];
}

/**
 * Output from the file generation actor
 */
export interface FileGenerationOutput {
	filesCreated: string[];
	filesModified: FileModification[];
	configPath: string | null;
	layoutPath: string | null;
	nextConfigPath: string | null;
	envPath: string | null;
}

/**
 * Read file contents for backup
 */
async function readFileForBackup(filePath: string): Promise<string | null> {
	const fs = await import('node:fs/promises');
	try {
		return await fs.readFile(filePath, 'utf-8');
	} catch {
		return null;
	}
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
	const fs = await import('node:fs/promises');
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * File generation actor
 *
 * Creates and modifies files for the c15t setup with backup support.
 */
export const fileGenerationActor = fromPromise<
	FileGenerationOutput,
	FileGenerationInput
>(async ({ input }) => {
	const {
		cliContext,
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		enableSSR,
		enableDevTools,
		uiStyle,
		expandedTheme,
		selectedScripts,
	} = input;

	const filesCreated: string[] = [];
	const filesModified: FileModification[] = [];
	const result: FileGenerationOutput = {
		filesCreated: [],
		filesModified: [],
		configPath: null,
		layoutPath: null,
		nextConfigPath: null,
		envPath: null,
	};

	const { projectRoot, framework, cwd, logger } = cliContext;
	const pkg = framework.pkg;

	// Import the existing generate-files utility
	// We delegate to the existing implementation but track files
	const { generateFiles } = await import(
		'~/commands/generate/options/utils/generate-files'
	);

	// Create a spinner mock that doesn't do anything (we handle UI separately)
	const spinnerMock = {
		start: (msg: string) => logger.debug(`[spinner] ${msg}`),
		stop: (msg: string) => logger.debug(`[spinner] ${msg}`),
		message: (msg: string) => logger.debug(`[spinner] ${msg}`),
	};

	try {
		// Track files before generation for backup
		const potentialFiles = [
			path.join(projectRoot, 'c15t.config.ts'),
			path.join(projectRoot, '.env.local'),
			path.join(projectRoot, '.env.example'),
			path.join(projectRoot, 'next.config.ts'),
			path.join(projectRoot, 'next.config.js'),
			path.join(projectRoot, 'next.config.mjs'),
		];

		// Backup existing files
		for (const filePath of potentialFiles) {
			const exists = await fileExists(filePath);
			if (exists) {
				const backup = await readFileForBackup(filePath);
				if (backup !== null) {
					filesModified.push({
						path: filePath,
						backup,
						type: 'modified',
					});
				}
			}
		}

		// Generate files using existing utility
		const generateResult = await generateFiles({
			context: cliContext,
			mode: mode as 'c15t' | 'self-hosted' | 'offline' | 'custom',
			spinner: spinnerMock as ReturnType<
				typeof import('@clack/prompts').spinner
			>,
			backendURL: backendURL ?? undefined,
			useEnvFile,
			proxyNextjs,
			enableSSR,
			enableDevTools,
			uiStyle,
			expandedTheme: expandedTheme ?? undefined,
			selectedScripts,
		});

		// Record paths
		if (generateResult.configPath) {
			result.configPath = generateResult.configPath;
			if (!filesModified.some((f) => f.path === generateResult.configPath)) {
				filesCreated.push(generateResult.configPath);
			}
		}

		if (generateResult.layoutPath) {
			result.layoutPath = generateResult.layoutPath;
		}

		if (generateResult.nextConfigPath) {
			result.nextConfigPath = generateResult.nextConfigPath;
			if (generateResult.nextConfigCreated) {
				filesCreated.push(generateResult.nextConfigPath);
			}
		}

		// Track env files
		if (useEnvFile && backendURL) {
			const envPath = path.join(projectRoot, '.env.local');
			const envExamplePath = path.join(projectRoot, '.env.example');

			if (
				!filesModified.some((f) => f.path === envPath) &&
				(await fileExists(envPath))
			) {
				// File was created
				filesCreated.push(envPath);
			}
			result.envPath = envPath;

			if (
				!filesModified.some((f) => f.path === envExamplePath) &&
				(await fileExists(envExamplePath))
			) {
				filesCreated.push(envExamplePath);
			}
		}

		result.filesCreated = filesCreated;
		result.filesModified = filesModified;

		return result;
	} catch (error) {
		// Return partial results with error info
		result.filesCreated = filesCreated;
		result.filesModified = filesModified;
		throw error;
	}
});

/**
 * Rollback actor - restores files to their previous state
 */
export interface RollbackInput {
	filesCreated: string[];
	filesModified: FileModification[];
}

export interface RollbackOutput {
	success: boolean;
	errors: string[];
}

export const rollbackActor = fromPromise<RollbackOutput, RollbackInput>(
	async ({ input }) => {
		const { filesCreated, filesModified } = input;
		const fs = await import('node:fs/promises');
		const errors: string[] = [];

		// Delete created files
		for (const filePath of filesCreated) {
			try {
				await fs.unlink(filePath);
			} catch (error) {
				errors.push(
					`Failed to delete ${filePath}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}

		// Restore modified files
		for (const mod of filesModified) {
			try {
				await fs.writeFile(mod.path, mod.backup, 'utf-8');
			} catch (error) {
				errors.push(
					`Failed to restore ${mod.path}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}

		return {
			success: errors.length === 0,
			errors,
		};
	}
);
