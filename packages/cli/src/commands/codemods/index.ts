import {
	type CodemodDefinition,
	type CodemodRunResult,
	type CodemodVersionMetadata,
	defineCodemod,
	runCodemods as runHexbusCodemods,
} from '@inth/hexbus-codemods';
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
import { detectInstalledC15tVersion } from './versioning';

interface C15tCodemodDefinition {
	id: string;
	label: string;
	hint: string;
	run: C15tCodemodRunner;
	versioning?: CodemodVersionMetadata;
}

interface C15tCodemodExecutionResult {
	totalFiles: number;
	changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}>;
	errors: Array<{ filePath: string; error: string }>;
}

type C15tCodemodRunner = (options: {
	projectRoot: string;
	dryRun: boolean;
}) => Promise<C15tCodemodExecutionResult>;

function toHexbusCodemodResult(
	result: C15tCodemodExecutionResult
): CodemodRunResult {
	return {
		changedFiles: result.changedFiles.map((file) => {
			let summary = '';
			if (file.summaries.length) {
				summary = `: ${file.summaries.join(', ')}`;
			}
			return `${file.filePath} (${file.operations} changes${summary})`;
		}),
		errors: result.errors.map((error) => `${error.filePath}: ${error.error}`),
	};
}

function createC15tCodemod(
	definition: C15tCodemodDefinition
): CodemodDefinition<CliContext> {
	return defineCodemod<CliContext>({
		id: definition.id,
		label: definition.label,
		hint: definition.hint,
		versioning: definition.versioning,
		async run(_context, options) {
			const result = await definition.run({
				projectRoot: options.projectRoot,
				dryRun: options.dryRun === true,
			});
			return toHexbusCodemodResult(result);
		},
	});
}

const codemods = [
	createC15tCodemod({
		id: 'active-ui-api',
		label: 'showPopup API -> activeUI API',
		hint: 'Migrates showPopup/isPrivacyDialogOpen and setter usage to activeUI.',
		run: runActiveUiApiCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'component-renames',
		label: 'legacy component names -> v2 names',
		hint: 'Renames CookieBanner/ConsentManagerDialog/ConsentManagerWidget.',
		run: runComponentRenamesCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'gdpr-types-to-consent-categories',
		label: 'gdprTypes -> consentCategories',
		hint: 'Migrates gdprTypes/initialGDPRTypes to consentCategories.',
		run: runGdprTypesToConsentCategoriesCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'ignore-geo-location-to-overrides',
		label: 'ignoreGeoLocation -> overrides',
		hint: "Migrates ignoreGeoLocation to overrides (forces country='DE').",
		run: runIgnoreGeoLocationToOverridesCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'mode-c15t-to-hosted',
		label: "mode: 'c15t' -> 'hosted'",
		hint: "Migrates legacy mode values from 'c15t' to 'hosted'.",
		run: runC15tModeToHostedCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'offline-add-policy-packs',
		label: 'offline mode -> add policy packs',
		hint: 'Adds starter policyPackPresets to offline configs missing policies.',
		run: runOfflineAddPolicyPacksCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'react-options-to-top-level',
		label: 'react options -> top-level options',
		hint: 'Lifts react.theme/colorScheme/disableAnimation to top-level.',
		run: runReactOptionsToTopLevelCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'tracking-blocker-to-network-blocker',
		label: 'trackingBlockerConfig -> networkBlocker',
		hint: 'Migrates tracking blocker config to network blocker rules.',
		run: runTrackingBlockerToNetworkBlockerCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'translations-to-i18n',
		label: 'translations -> i18n',
		hint: 'Migrates legacy translation config keys to the v2 i18n shape.',
		run: runTranslationsToI18nCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
	createC15tCodemod({
		id: 'add-stylesheet-imports',
		label: 'configure global CSS for prebuilt UI',
		hint: 'Moves styled c15t imports into the app CSS entrypoint, including Tailwind 3 and IAB variants when needed.',
		run: runAddStylesheetImportsCodemod,
		versioning: {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		},
	}),
];

/**
 * Runs one or more selected codemods for the current project.
 *
 * @param context CLI execution context.
 * @returns Promise that resolves when selected codemods complete.
 */
export async function runCodemods(context: CliContext): Promise<void> {
	const { commandArgs, flags, logger } = context;
	const dryRun = commandArgs.includes('--dry-run');
	await runHexbusCodemods(context, codemods, {
		brandName: 'c15t',
		detectInstalledVersion: async (projectRoot) => {
			const version = await detectInstalledC15tVersion(projectRoot);
			if (!version) {
				logger.warn(
					'Could not detect c15t version from package.json. Showing all codemods.'
				);
			}
			return version;
		},
		dryRun: dryRun || flags['dry-run'] === true,
	});
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
