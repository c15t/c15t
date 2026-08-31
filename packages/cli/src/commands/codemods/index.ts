import * as p from '@clack/prompts';

import type { CliCommand, CliContext } from '~/context/types';

import { runActiveUiApiCodemod } from './active-ui-api';
import { runAddStylesheetImportsCodemod } from './add-stylesheet-imports';
import { runComponentRenamesCodemod } from './component-renames';
import { runGdprTypesToConsentCategoriesCodemod } from './gdpr-types-to-consent-categories';
import { runIgnoreGeoLocationToOverridesCodemod } from './ignore-geo-location-to-overrides';
import { runC15tModeToHostedCodemod } from './mode-c15t-to-hosted';
import { runOfflineAddPolicyPacksCodemod } from './offline-add-policy-packs';
import { runReactOptionsToTopLevelCodemod } from './react-options-to-top-level';
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
	run: (context: CliContext, dryRun: boolean) => Promise<void>;
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
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runActiveUiApiCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Renames CookieBanner/ConsentManagerDialog/ConsentManagerWidget.',
		id: 'component-renames',
		label: 'legacy component names -> v2 names',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runComponentRenamesCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Migrates gdprTypes/initialGDPRTypes to consentCategories.',
		id: 'gdpr-types-to-consent-categories',
		label: 'gdprTypes -> consentCategories',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runGdprTypesToConsentCategoriesCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: "Migrates ignoreGeoLocation to overrides (forces country='DE').",
		id: 'ignore-geo-location-to-overrides',
		label: 'ignoreGeoLocation -> overrides',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runIgnoreGeoLocationToOverridesCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: "Migrates legacy mode values from 'c15t' to 'hosted'.",
		id: 'mode-c15t-to-hosted',
		label: "mode: 'c15t' -> 'hosted'",
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runC15tModeToHostedCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Adds starter policyPackPresets to offline configs missing policies.',
		id: 'offline-add-policy-packs',
		label: 'offline mode -> add policy packs',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runOfflineAddPolicyPacksCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Lifts react.theme/colorScheme/disableAnimation to top-level.',
		id: 'react-options-to-top-level',
		label: 'react options -> top-level options',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runReactOptionsToTopLevelCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Migrates tracking blocker config to network blocker rules.',
		id: 'tracking-blocker-to-network-blocker',
		label: 'trackingBlockerConfig -> networkBlocker',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runTrackingBlockerToNetworkBlockerCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Migrates legacy translation config keys to the v2 i18n shape.',
		id: 'translations-to-i18n',
		label: 'translations -> i18n',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runTranslationsToI18nCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		hint: 'Moves styled c15t imports into the app CSS entrypoint, including Tailwind 3 and IAB variants when needed.',
		id: 'add-stylesheet-imports',
		label: 'configure global CSS for prebuilt UI',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runAddStylesheetImportsCodemod({
				dryRun,

				projectRoot,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
];

/**
 * Runs one or more selected codemods for the current project.
 *
 * @param context CLI execution context.
 * @returns Promise that resolves when selected codemods complete.
 */
export const runCodemods = async function runCodemods(
	context: CliContext
): Promise<void> {
	const { logger, commandArgs, projectRoot } = context;
	const dryRun = commandArgs.includes('--dry-run');
	const installedVersion = await detectInstalledC15tVersion(projectRoot);

	if (installedVersion) {
		logger.info(`Detected c15t version ${installedVersion}.`);
	} else {
		logger.warn(
			'Could not detect c15t version from package.json. Showing all codemods.'
		);
	}

	const availableCodemods = codemods.filter((codemod) =>
		isCodemodApplicableForVersion(installedVersion, codemod.versioning ?? {})
	);

	if (availableCodemods.length === 0) {
		if (installedVersion) {
			logger.info(
				`No codemods are applicable for detected c15t version ${installedVersion}.`
			);
		} else {
			logger.info('No codemods available.');
		}
		return;
	}

	const selected = await p.multiselect({
		message: 'Select codemods to run (space to toggle, enter to confirm):',
		options: availableCodemods.map((codemod) => ({
			hint: codemod.hint,
			label: codemod.label,
			value: codemod.id,
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
		const codemod = availableCodemods.find((item) => item.id === codemodId);
		if (!codemod) {
			logger.warn(`Unknown codemod selected: ${codemodId}`);
			continue;
		}

		logger.info(`Running: ${codemod.label}`);
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await codemod.run(context, dryRun);
	}
};

/**
 * Top-level CLI command definition for project codemods.
 */
export const codemodsCommand: CliCommand = {
	action: runCodemods,
	description:
		'Run project codemods (for example translations -> i18n migration).',
	hint: 'Run migration codemods',
	label: 'Codemods',
	name: 'codemods',
};
