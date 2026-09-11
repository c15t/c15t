import * as p from '@clack/prompts';

import type { CliCommand, CliContext } from '~/context/types';

import { CliError } from '../../core/errors';
import { forEachSequential } from '../../utils/for-each-sequential';
import { runActiveUiApiCodemod } from './active-ui-api';
import { runAddStylesheetImportsCodemod } from './add-stylesheet-imports';
import { runComponentRenamesCodemod } from './component-renames';
import { runGdprTypesToConsentCategoriesCodemod } from './gdpr-types-to-consent-categories';
import { runIgnoreGeoLocationToOverridesCodemod } from './ignore-geo-location-to-overrides';
import { runC15tModeToHostedCodemod } from './mode-c15t-to-hosted';
import { runReactOptionsToTopLevelCodemod } from './react-options-to-top-level';
import { createCodemodSession } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import { runTrackingBlockerToNetworkBlockerCodemod } from './tracking-blocker-to-network-blocker';
import { runTranslationsToI18nCodemod } from './translations-to-i18n';
import {
	detectInstalledC15tVersion,
	isCodemodApplicableForVersion,
} from './versioning';
import type { CodemodVersionMetadata } from './versioning';

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
	run: (options: CodemodRunOptions) => Promise<CodemodRunResult>;
	/** Version metadata used to determine codemod applicability. */
	versioning?: CodemodVersionMetadata;
}

interface CodemodExecutionResult {
	totalFiles: number;
	changedFiles: {
		filePath: string;
		operations: number;
		summaries: string[];
	}[];
	errors: { filePath: string; error: string }[];
}

const logCodemodResult = function logCodemodResult(
	context: CliContext,
	result: CodemodExecutionResult,
	dryRun: boolean
): void {
	const { logger } = context;
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
		logger.info(`- ${file.filePath} (${file.operations} changes${summary})`);
	}

	for (const error of result.errors) {
		logger.warn(`Skipped ${error.filePath}: ${error.error}`);
	}
};

const codemods: CodemodDefinition[] = [
	{
		hint: 'Migrates showPopup/isPrivacyDialogOpen and setter usage to activeUI.',
		id: 'active-ui-api',
		label: 'showPopup API -> activeUI API',
		run: runActiveUiApiCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Renames CookieBanner/ConsentManagerDialog/ConsentManagerWidget.',
		id: 'component-renames',
		label: 'legacy component names -> v2 names',
		run: runComponentRenamesCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Migrates gdprTypes/initialGDPRTypes to consentCategories.',
		id: 'gdpr-types-to-consent-categories',
		label: 'gdprTypes -> consentCategories',
		run: runGdprTypesToConsentCategoriesCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: "Migrates ignoreGeoLocation to overrides (forces country='DE').",
		id: 'ignore-geo-location-to-overrides',
		label: 'ignoreGeoLocation -> overrides',
		run: runIgnoreGeoLocationToOverridesCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: "Migrates legacy mode values from 'c15t' to 'hosted'.",
		id: 'mode-c15t-to-hosted',
		label: "mode: 'c15t' -> 'hosted'",
		run: runC15tModeToHostedCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},

	{
		hint: 'Lifts react.theme/colorScheme/disableAnimation to top-level.',
		id: 'react-options-to-top-level',
		label: 'react options -> top-level options',
		run: runReactOptionsToTopLevelCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Migrates tracking blocker config to network blocker rules.',
		id: 'tracking-blocker-to-network-blocker',
		label: 'trackingBlockerConfig -> networkBlocker',
		run: runTrackingBlockerToNetworkBlockerCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Migrates legacy translation config keys to the v2 i18n shape.',
		id: 'translations-to-i18n',
		label: 'translations -> i18n',
		run: runTranslationsToI18nCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Moves styled c15t imports into the app CSS entrypoint, including Tailwind 3 and IAB variants when needed.',
		id: 'add-stylesheet-imports',
		label: 'configure global CSS for prebuilt UI',
		run: runAddStylesheetImportsCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
];

const validateVersionFlags = (flags: CliContext['flags']): void => {
	if (
		typeof flags.from === 'string' &&
		!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u.test(flags.from)
	) {
		throw new CliError('FLAG_INVALID', {
			details: '--from requires a full version, for example --from 1.9.0.',
		});
	}
	if (flags.to !== undefined && flags.to !== '2.0.0') {
		throw new CliError('FLAG_INVALID', {
			details:
				'These legacy transforms target 2.0.0. For v3 use the migration workflow in the bundled CLI docs.',
		});
	}
};

/**
 * Runs one or more selected codemods for the current project.
 *
 * @param context CLI execution context.
 * @returns Promise that resolves when selected codemods complete.
 */
export const runCodemods = async (context: CliContext) => {
	const { logger, commandArgs, projectRoot, flags } = context;
	const dryRun = flags['dry-run'] === true;
	const declaredVersion = await detectInstalledC15tVersion(projectRoot);
	const sourceVersion =
		typeof flags.from === 'string' ? flags.from : declaredVersion;
	validateVersionFlags(flags);
	const available = codemods.filter((item) =>
		isCodemodApplicableForVersion(sourceVersion, item.versioning ?? {})
	);
	if (flags.list === true) {
		const entries = codemods.map(({ id, hint, versioning }) => ({
			description: hint,
			id,
			...versioning,
			applicable: available.some((item) => item.id === id),
		}));
		for (const entry of entries) {
			logger.info(`${entry.id}: ${entry.description}`);
		}
		return {
			codemods: entries,
			declaredVersion,
			kind: 'legacy-codemods',
			sourceVersion,
			targetVersion: '2.0.0',
		};
	}
	const unknown = commandArgs.filter(
		(id) => !codemods.some((item) => item.id === id)
	);
	if (unknown.length > 0) {
		throw new CliError('FLAG_INVALID', {
			details: `Unknown codemod: ${unknown.join(', ')}. Run codemods --list.`,
		});
	}
	let selected: CodemodDefinition[] = [];
	if (commandArgs.length > 0) {
		selected = codemods.filter((item) => commandArgs.includes(item.id));
	} else if (flags.all === true) {
		selected = available;
	}
	if (selected.length === 0 && commandArgs.length === 0 && flags.all !== true) {
		if (flags['non-interactive'] === true) {
			throw new CliError('FLAG_INVALID', {
				details:
					'Specify codemod IDs or --all --from <source-version>. Use --dry-run to review changes.',
			});
		}
		if (available.length > 0) {
			const answer = await p.multiselect({
				message: 'Select legacy v1 to v2 transforms:',
				options: available.map(({ id, label, hint }) => ({
					hint,
					label,
					value: id,
				})),
				required: false,
			});
			if (p.isCancel(answer)) {
				throw new CliError('CANCELLED');
			}
			selected = available.filter(({ id }) => answer.includes(id));
		}
	}
	if (selected.length === 0) {
		logger.info(
			'No legacy transforms selected. If dependencies were already upgraded, pass --from with the original version or name a transform explicitly.'
		);
		return {
			declaredVersion,
			dryRun,
			kind: 'legacy-codemods',
			results: [],
			sourceVersion,
			targetVersion: '2.0.0',
		};
	}
	const session = await createCodemodSession(projectRoot);
	const results: { id: string; result: CodemodRunResult }[] = [];
	await forEachSequential(selected, {
		run: async (item) => {
			// Each migration sees the preceding migration's edits, including in dry runs.
			const result = await item.run({ dryRun, projectRoot, session });
			logCodemodResult(context, result, dryRun);
			results.push({ id: item.id, result });
			if (result.errors.length > 0) {
				throw new CliError('MIGRATION_FAILED', {
					details: `${item.id} failed for ${result.errors.length} file(s). ${dryRun ? 'No changes saved.' : 'Some files may have changed; review the working tree.'} ${result.errors.map(({ filePath, error }) => `${filePath}: ${error}`).join('; ')}`,
				});
			}
		},
	});
	return {
		declaredVersion,
		dryRun,
		kind: 'legacy-codemods',
		results,
		sourceVersion,
		targetVersion: '2.0.0',
	};
};

/**
 * Top-level CLI command definition for project codemods.
 */
export const codemodsCommand: CliCommand = {
	action: runCodemods,
	description:
		'Run project codemods (for example translations -> i18n migration).',
	hiddenFromMenu: true,
	hint: 'Legacy v1 to v2 migrations',
	label: 'Codemods',
	name: 'codemods',
};
