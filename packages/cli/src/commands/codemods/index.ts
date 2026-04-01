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
	type CodemodVersionMetadata,
	detectInstalledC15tVersion,
	isCodemodApplicableForVersion,
} from './versioning';

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

type CodemodExecutionResult = {
	totalFiles: number;
	changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}>;
	errors: Array<{ filePath: string; error: string }>;
};

function logCodemodResult(
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
}

const codemods: CodemodDefinition[] = [
	{
		id: 'active-ui-api',
		label: 'showPopup API -> activeUI API',
		hint: 'Migrates showPopup/isPrivacyDialogOpen and setter usage to activeUI.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runActiveUiApiCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'component-renames',
		label: 'legacy component names -> v2 names',
		hint: 'Renames CookieBanner/ConsentManagerDialog/ConsentManagerWidget.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runComponentRenamesCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'gdpr-types-to-consent-categories',
		label: 'gdprTypes -> consentCategories',
		hint: 'Migrates gdprTypes/initialGDPRTypes to consentCategories.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runGdprTypesToConsentCategoriesCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'ignore-geo-location-to-overrides',
		label: 'ignoreGeoLocation -> overrides',
		hint: "Migrates ignoreGeoLocation to overrides (forces country='DE').",
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runIgnoreGeoLocationToOverridesCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'mode-c15t-to-hosted',
		label: "mode: 'c15t' -> 'hosted'",
		hint: "Migrates legacy mode values from 'c15t' to 'hosted'.",
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runC15tModeToHostedCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'offline-add-policy-packs',
		label: 'offline mode -> add policy packs',
		hint: 'Adds starter policyPackPresets to offline configs missing policies.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runOfflineAddPolicyPacksCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'react-options-to-top-level',
		label: 'react options -> top-level options',
		hint: 'Lifts react.theme/colorScheme/disableAnimation to top-level.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runReactOptionsToTopLevelCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'tracking-blocker-to-network-blocker',
		label: 'trackingBlockerConfig -> networkBlocker',
		hint: 'Migrates tracking blocker config to network blocker rules.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runTrackingBlockerToNetworkBlockerCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'translations-to-i18n',
		label: 'translations -> i18n',
		hint: 'Migrates legacy translation config keys to the v2 i18n shape.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runTranslationsToI18nCodemod({
				projectRoot,
				dryRun,
			});
			logCodemodResult(context, result, dryRun);
		},
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	},
	{
		id: 'add-stylesheet-imports',
		label: 'add stylesheet imports for prebuilt UI',
		hint: 'Adds @c15t/react/styles.css or @c15t/nextjs/styles.css imports for styled components.',
		run: async (context, dryRun) => {
			const { projectRoot } = context;
			const result = await runAddStylesheetImportsCodemod({
				projectRoot,
				dryRun,
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
export async function runCodemods(context: CliContext): Promise<void> {
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
		const codemod = availableCodemods.find((item) => item.id === codemodId);
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
