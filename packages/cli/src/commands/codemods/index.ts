import * as p from '@clack/prompts';
import type { CliCommand, CliContext } from '~/context/types';
import { runTranslationsToI18nCodemod } from './translations-to-i18n';

/**
 * Describes a runnable codemod exposed in the interactive codemods menu.
 */
export interface CodemodDefinition {
	/** Stable codemod identifier used in prompt selection values. */
	id: string;
	/** Human-readable menu label. */
	label: string;
	/** Short description shown in the prompt hint column. */
	hint: string;
	/** Executes the codemod for the provided CLI context. */
	run: (context: CliContext, dryRun: boolean) => Promise<void>;
}

const codemods: CodemodDefinition[] = [
	{
		id: 'translations-to-i18n',
		label: 'translations -> i18n',
		hint: 'Migrates legacy translation config keys to the v2 i18n shape.',
		run: async (context, dryRun) => {
			const { logger, projectRoot } = context;
			const result = await runTranslationsToI18nCodemod({
				projectRoot,
				dryRun,
			});

			if (result.changedFiles.length === 0) {
				logger.info(
					`No files needed updates (scanned ${result.totalFiles} source files).`
				);
				for (const error of result.errors) {
					logger.warn(`Skipped ${error.filePath}: ${error.error}`);
				}
				return;
			}

			let actionPrefix = 'Applied';
			if (dryRun) {
				actionPrefix = 'Dry run';
			}

			logger.success(
				`${actionPrefix}: updated ${result.changedFiles.length} file(s) out of ${result.totalFiles} scanned.`
			);

			for (const file of result.changedFiles) {
				let summary = '';
				if (file.summaries.length > 0) {
					summary = `: ${file.summaries.join(', ')}`;
				}
				logger.info(
					`- ${file.filePath} (${file.operations} changes${summary})`
				);
			}

			for (const error of result.errors) {
				logger.warn(`Skipped ${error.filePath}: ${error.error}`);
			}
		},
	},
];

/**
 * Runs one or more selected codemods for the current project.
 *
 * @param context CLI execution context.
 * @returns Promise that resolves when selected codemods complete.
 */
export async function runCodemods(context: CliContext): Promise<void> {
	const { logger, commandArgs } = context;
	const dryRun = commandArgs.includes('--dry-run');

	const selected = await p.multiselect({
		message: 'Select codemods to run (space to toggle, enter to confirm):',
		options: codemods.map((codemod) => ({
			value: codemod.id,
			label: codemod.label,
			hint: codemod.hint,
		})),
		required: false,
	});

	if (p.isCancel(selected)) {
		logger.warn('Codemod execution cancelled.');
		return;
	}

	const selectedCodemods = selected as string[];
	if (!selectedCodemods.length) {
		logger.info('No codemods selected.');
		return;
	}

	let dryRunSuffix = '';
	if (dryRun) {
		dryRunSuffix = ' in dry-run mode';
	}

	logger.info(
		`Running ${selectedCodemods.length} codemod(s)${dryRunSuffix}...`
	);

	for (const codemodId of selectedCodemods) {
		const codemod = codemods.find((item) => item.id === codemodId);
		if (!codemod) {
			logger.warn(`Unknown codemod selected: ${codemodId}`);
			continue;
		}

		logger.info(`Running: ${codemod.label}`);
		await codemod.run(context, dryRun);
	}
}

/**
 * Top-level CLI command definition for project codemods.
 */
export const codemodsCommand: CliCommand = {
	name: 'codemods',
	label: 'Codemods',
	hint: 'Run migration codemods',
	description:
		'Run project codemods (for example translations -> i18n migration).',
	action: runCodemods,
};
