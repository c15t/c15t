/**
 * File generation actor for the generate state machine
 *
 * Handles file creation and modification with backup support for rollback.
 */

import path from 'node:path';

import type * as ClackPromptsTypes from '@clack/prompts';
import { fromPromise } from 'xstate';

import { applyFileEdits } from '~/commands/generate/templates/shared/file-plan';
import type { StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
import { forEachSequential } from '~/utils/for-each-sequential';

import type { FileModification } from '../../types';
import {
	saveGenerationJournal,
	clearGenerationJournal,
	recoverGeneration,
} from '../journal';
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
 * File generation actor
 *
 * Creates and modifies files for the hosted setup with backup support.
 */
export const fileGenerationActor = fromPromise<
	FileGenerationOutput,
	FileGenerationInput
>(async ({ input, signal }) => {
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
		configPath: null,
		envPath: null,
		filesCreated: [],
		filesModified: [],
		layoutPath: null,
		nextConfigPath: null,
	};

	const { projectRoot, logger } = cliContext;

	// Import the existing generate-files utility
	// We delegate to the existing implementation but track files
	const { planGenerateFiles } =
		await import('~/commands/generate/options/utils/generate-files');

	// Create a spinner mock that doesn't do anything (we handle UI separately)
	const spinnerMock = {
		message: (msg: string) => logger.debug(`[spinner] ${msg}`),
		start: (msg: string) => logger.debug(`[spinner] ${msg}`),
		stop: (msg: string) => logger.debug(`[spinner] ${msg}`),
	};

	const generateResult = await planGenerateFiles({
		backendURL: backendURL ?? undefined,
		context: cliContext,
		enableDevTools,
		enableSSR,
		expandedTheme: expandedTheme ?? undefined,
		mode,
		proxyNextjs,
		selectedScripts,
		signal,
		spinner: spinnerMock as ReturnType<typeof ClackPromptsTypes.spinner>,
		uiStyle,
		useEnvFile,
	});
	await saveGenerationJournal(projectRoot, generateResult.edits);
	try {
		await applyFileEdits(generateResult.edits, { signal });
	} catch (error) {
		if (!(error instanceof AggregateError)) {
			await clearGenerationJournal(projectRoot);
		}
		throw error;
	}
	for (const edit of generateResult.edits) {
		if (edit.before === null) {
			filesCreated.push(edit.path);
		} else {
			filesModified.push({
				backup: edit.before,
				path: edit.path,
				type: 'modified',
			});
		}
	}
	return {
		...result,
		configPath: generateResult.configPath ?? null,
		envPath:
			useEnvFile && backendURL ? path.join(projectRoot, '.env.local') : null,
		filesCreated,
		filesModified,
		layoutPath: generateResult.layoutPath ?? null,
		nextConfigPath: generateResult.nextConfigPath ?? null,
	};
});

/**
 * Rollback actor - restores files to their previous state
 */
export interface RollbackInput {
	projectRoot?: string;
	filesCreated: string[];
	filesModified: FileModification[];
}

export interface RollbackOutput {
	success: boolean;
	errors: string[];
}

export const rollbackActor = fromPromise<RollbackOutput, RollbackInput>(
	async ({ input }) => {
		if (input.projectRoot) {
			try {
				await recoverGeneration(input.projectRoot, true);
				return { errors: [], success: true };
			} catch (error) {
				return {
					errors: [error instanceof Error ? error.message : String(error)],
					success: false,
				};
			}
		}
		const { filesCreated, filesModified } = input;
		const fs = await import('node:fs/promises');
		const errors: string[] = [];

		// Delete created files
		await forEachSequential(filesCreated, {
			run: async (filePath) => {
				try {
					await fs.unlink(filePath);
				} catch (error) {
					errors.push(
						`Failed to delete ${filePath}: ${error instanceof Error ? error.message : String(error)}`
					);
				}
			},
		});

		// Restore modified files
		await forEachSequential(filesModified, {
			run: async (modification) => {
				try {
					await fs.writeFile(modification.path, modification.backup, 'utf-8');
				} catch (error) {
					errors.push(
						`Failed to restore ${modification.path}: ${error instanceof Error ? error.message : String(error)}`
					);
				}
			},
		});

		return {
			errors,
			success: errors.length === 0,
		};
	}
);
