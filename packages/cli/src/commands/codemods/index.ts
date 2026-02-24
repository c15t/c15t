import * as p from '@clack/prompts';
import type { CliCommand, CliContext } from '~/context/types';
import { runTranslationsToI18nCodemod } from './translations-to-i18n';

interface CodemodDefinition {
	id: string;
	label: string;
	hint: string;
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
				return;
			}

			logger.success(
				`${dryRun ? 'Dry run' : 'Applied'}: updated ${result.changedFiles.length} file(s) out of ${result.totalFiles} scanned.`
			);

			for (const file of result.changedFiles) {
				const summary =
					file.summaries.length > 0 ? `: ${file.summaries.join(', ')}` : '';
				logger.info(
					`- ${file.filePath} (${file.operations} changes${summary})`
				);
			}
		},
	},
];

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

	logger.info(
		`Running ${selectedCodemods.length} codemod(s)${dryRun ? ' in dry-run mode' : ''}...`
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

export const codemodsCommand: CliCommand = {
	name: 'codemods',
	label: 'Codemods',
	hint: 'Run migration codemods',
	description:
		'Run project codemods (for example translations -> i18n migration).',
	action: runCodemods,
};
