import * as p from '@clack/prompts';

import type { CliCommand, CliContext } from '~/context/types';

import { CliError } from '../../core/errors';
import { forEachSequential } from '../../utils/for-each-sequential';
import { runActiveUiApiCodemod } from './active-ui-api';
import { runAddStylesheetImportsCodemod } from './add-stylesheet-imports';
import { runBackendConfigToV3Codemod } from './backend-config-to-v3';
import { runCallbacksToV3Codemod } from './callbacks-to-v3';
import { runComponentRenamesCodemod } from './component-renames';
import { runConsentProviderOptionsCodemod } from './consent-provider-options';
import { runCssVariablesToV3Codemod } from './css-variables-to-v3';
import { runDevToolsToC15tCodemod } from './dev-tools-to-c15t';
import { runGdprTypesToConsentCategoriesCodemod } from './gdpr-types-to-consent-categories';
import { runIabOptionToIabProviderCodemod } from './iab-option-to-iab-provider';
import { runIgnoreGeoLocationToOverridesCodemod } from './ignore-geo-location-to-overrides';
import { runC15tModeToHostedCodemod } from './mode-c15t-to-hosted';
import { runNodeSdkToV3Codemod } from './node-sdk-to-v3';
import { runPackagesToC15tCodemod } from './packages-to-c15t';
import { runPolicyPacksToPolicyRulesCodemod } from './policy-packs-to-policy-rules';
import { runPostcssTailwind3Codemod } from './postcss-tailwind3';
import { runReactOptionsToTopLevelCodemod } from './react-options-to-top-level';
import { runRootExportsToSubpathsCodemod } from './root-exports-to-subpaths';
import { createCodemodSession } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import { runScriptsToIntegrationsCodemod } from './scripts-to-integrations';
import { runThemeToConsentThemeCodemod } from './theme-to-consent-theme';
import { runTrackingBlockerToNetworkBlockerCodemod } from './tracking-blocker-to-network-blocker';
import { runTranslationsToI18nCodemod } from './translations-to-i18n';
import { runUseConsentManagerToHooksCodemod } from './use-consent-manager-to-hooks';
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
	/**
	 * Release the transform migrates to. Only `2.0.0` transforms join `--all`
	 * and the interactive menu; later ones run when named.
	 */
	targetVersion?: string;
}

const LEGACY_TARGET_VERSION = '2.0.0';
const V3_TARGET_VERSION = '3.0.0';
const V3_VERSIONING: CodemodVersionMetadata = {
	fromRange: '<3.0.0-0',
	toRange: '>=3.0.0-0',
};

interface CodemodExecutionResult {
	totalFiles: number;
	changedFiles: {
		filePath: string;
		operations: number;
		summaries: string[];
	}[];
	errors: { filePath: string; error: string }[];
	warnings?: { filePath: string; message: string }[];
}

const logCodemodResult = function logCodemodResult(
	context: CliContext,
	result: CodemodExecutionResult,
	dryRun: boolean
): void {
	const { logger } = context;
	for (const warning of result.warnings ?? []) {
		logger.warn(`${warning.filePath}: ${warning.message}`);
	}
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

// V2 prereleases already use the v2 API. Include them in the target range
// so automatic selection never treats an RC or canary as a v1 application.
const codemods: CodemodDefinition[] = [
	{
		hint: 'Migrates showPopup/isPrivacyDialogOpen and setter usage to activeUI.',
		id: 'active-ui-api',
		label: 'showPopup API -> activeUI API',
		run: runActiveUiApiCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: 'Renames CookieBanner/ConsentManagerDialog/ConsentManagerWidget.',
		id: 'component-renames',
		label: 'legacy component names -> v2 names',
		run: runComponentRenamesCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: 'Migrates gdprTypes/initialGDPRTypes to consentCategories.',
		id: 'gdpr-types-to-consent-categories',
		label: 'gdprTypes -> consentCategories',
		run: runGdprTypesToConsentCategoriesCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: "Migrates ignoreGeoLocation to overrides (forces country='DE').",
		id: 'ignore-geo-location-to-overrides',
		label: 'ignoreGeoLocation -> overrides',
		run: runIgnoreGeoLocationToOverridesCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: "Migrates legacy mode values from 'c15t' to 'hosted'.",
		id: 'mode-c15t-to-hosted',
		label: "mode: 'c15t' -> 'hosted'",
		run: runC15tModeToHostedCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},

	{
		hint: 'Lifts react.theme/colorScheme/disableAnimation to top-level.',
		id: 'react-options-to-top-level',
		label: 'react options -> top-level options',
		run: runReactOptionsToTopLevelCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: 'Migrates tracking blocker config to network blocker rules.',
		id: 'tracking-blocker-to-network-blocker',
		label: 'trackingBlockerConfig -> networkBlocker',
		run: runTrackingBlockerToNetworkBlockerCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: 'Migrates legacy translation config keys to the v2 i18n shape.',
		id: 'translations-to-i18n',
		label: 'translations -> i18n',
		run: runTranslationsToI18nCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: 'Moves styled c15t imports into the app CSS entrypoint, including Tailwind 3 and IAB variants when needed.',
		id: 'add-stylesheet-imports',
		label: 'configure global CSS for prebuilt UI',
		run: runAddStylesheetImportsCodemod,
		versioning: {
			fromRange: '<2.0.0-0',
			toRange: '>=2.0.0-0',
		},
	},
	{
		hint: 'Points @c15t/react and @c15t/nextjs imports at c15t/react and c15t/next, and removes their styles.css imports, which v3 components add themselves.',
		id: 'packages-to-c15t',
		label: '@c15t/react and @c15t/nextjs -> c15t',
		run: runPackagesToC15tCodemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Rewrites useConsentManager() destructuring to the v3 hooks and marks fields that need manual work.',
		id: 'use-consent-manager-to-hooks',
		label: 'useConsentManager() -> v3 hooks',
		run: runUseConsentManagerToHooksCodemod,
		targetVersion: '3.0.0',
		versioning: {
			fromRange: '<3.0.0-alpha.3',
			toRange: '>=3.0.0-alpha.3',
		},
	},
	{
		hint: 'Renames @c15t/scripts imports to @c15t/integrations. Update the dependency separately.',
		id: 'scripts-to-integrations',
		label: '@c15t/scripts -> @c15t/integrations',
		run: runScriptsToIntegrationsCodemod,
		targetVersion: '3.0.0',
	},
	{
		hint: 'Renames ConsentManagerProvider to ConsentProvider, turns mode/backendURL/offlinePolicy into hosted() or offline(), and renames iframeBlockerConfig.',
		id: 'consent-provider-options',
		label: 'ConsentManagerProvider -> ConsentProvider',
		run: runConsentProviderOptionsCodemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Moves imports of names that left the c15t/react and c15t/next roots to /headless, /consent-dialog-trigger, /types and /components/consent-banner.',
		id: 'root-exports-to-subpaths',
		label: 'root exports -> v3 subpaths',
		run: runRootExportsToSubpathsCodemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Points @c15t/dev-tools/react and /tanstack imports at c15t/react/devtools or c15t/next/devtools.',
		id: 'dev-tools-to-c15t',
		label: '@c15t/dev-tools/react -> c15t devtools entry',
		run: runDevToolsToC15tCodemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Renames policyPackPresets to policyRulePresets and worldNoBanner() to worldOptOutNoPrompt().',
		id: 'policy-packs-to-policy-rules',
		label: 'policyPackPresets -> policyRulePresets',
		run: runPolicyPacksToPolicyRulesCodemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Renames --consent-widget-* to --consent-manager-* and --frame-* to --consent-gate-* in stylesheets and inline styles.',
		id: 'css-variables-to-v3',
		label: 'CSS variables -> v3 names',
		run: runCssVariablesToV3Codemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Adds the c15t PostCSS plugin before tailwindcss in an object-form postcss.config for Tailwind CSS 3.',
		id: 'postcss-tailwind3',
		label: 'Tailwind CSS 3 PostCSS plugin',
		run: runPostcssTailwind3Codemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Renames onConsentChanged to onChoiceRecorded and marks onConsentSet and onBannerFetched for manual work.',
		id: 'callbacks-to-v3',
		label: 'callbacks -> v3 callbacks',
		run: runCallbacksToV3Codemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Marks theme tokens on the provider, which need ConsentTheme or generateThemeCSS() in v3.',
		id: 'theme-to-consent-theme',
		label: 'theme tokens -> ConsentTheme',
		run: runThemeToConsentThemeCodemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Marks the iab provider option, which moves to <IABProvider> in v3.',
		id: 'iab-option-to-iab-provider',
		label: 'iab option -> IABProvider',
		run: runIabOptionToIabProviderCodemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Moves @c15t/node-sdk code to createC15tClient() and the v3 option and method names, and marks call sites whose results changed shape.',
		id: 'node-sdk-to-v3',
		label: '@c15t/node-sdk -> createC15tClient()',
		run: runNodeSdkToV3Codemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
	},
	{
		hint: 'Moves policyPacks, branding, customTranslations, i18n and appName under manifest in a @c15t/backend config, and marks adapter and other removed options.',
		id: 'backend-config-to-v3',
		label: '@c15t/backend config -> manifest',
		run: runBackendConfigToV3Codemod,
		targetVersion: V3_TARGET_VERSION,
		versioning: V3_VERSIONING,
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
 * The release a run migrates to: the latest target among the selected
 * transforms, so a run of v3 transforms reports 3.0.0.
 */
const runTarget = function runTarget(selected: CodemodDefinition[]): string {
	let latest = LEGACY_TARGET_VERSION;
	for (const item of selected) {
		const target = item.targetVersion ?? LEGACY_TARGET_VERSION;
		if (Number.parseInt(target, 10) > Number.parseInt(latest, 10)) {
			latest = target;
		}
	}
	return latest;
};

/** The result `kind` for a run that migrates to `targetVersion`. */
const runKind = function runKind(targetVersion: string): string {
	return targetVersion === LEGACY_TARGET_VERSION
		? 'legacy-codemods'
		: 'codemods';
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
	const available = codemods.filter(
		(item) =>
			(item.targetVersion ?? LEGACY_TARGET_VERSION) === LEGACY_TARGET_VERSION &&
			isCodemodApplicableForVersion(sourceVersion, item.versioning ?? {})
	);
	if (flags.list === true) {
		const entries = codemods.map(({ id, hint, targetVersion, versioning }) => ({
			description: hint,
			id,
			...versioning,
			applicable: isCodemodApplicableForVersion(
				sourceVersion,
				versioning ?? {}
			),
			...(targetVersion && { targetVersion }),
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
	const targetVersion = runTarget(selected);
	const results: {
		id: string;
		result: CodemodRunResult;
		targetVersion: string;
	}[] = [];
	await forEachSequential(selected, {
		run: async (item) => {
			// Each migration sees the preceding migration's edits, including in dry runs.
			const result = await item.run({ dryRun, projectRoot, session });
			logCodemodResult(context, result, dryRun);
			results.push({
				id: item.id,
				result,
				targetVersion: item.targetVersion ?? LEGACY_TARGET_VERSION,
			});
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
		kind: runKind(targetVersion),
		results,
		sourceVersion,
		targetVersion,
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
