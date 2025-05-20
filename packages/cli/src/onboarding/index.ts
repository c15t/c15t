import fs from 'node:fs/promises';
import path from 'node:path';
import type { C15TOptions } from '@c15t/backend';
import type { ConsentManagerOptions } from '@c15t/react';
import * as p from '@clack/prompts';
import open from 'open';
import color from 'picocolors';

import { isClientOptions } from '../actions/get-config/config-extraction';
import {
	detectFramework,
	detectProjectRoot,
} from '../context/framework-detection';
import {
	type PackageManagerResult,
	detectPackageManager,
} from '../context/package-manager-detection';
import type { CliContext } from '../context/types';
import { TelemetryEventName } from '../utils/telemetry';

import {
	addAndInstallDependenciesViaPM,
	getManualInstallCommand,
} from './dependencies';
import {
	setupC15tMode,
	setupCustomMode,
	setupOfflineMode,
	setupSelfHostedMode,
} from './storage-modes';

const WINDOWS_PATH_SEPARATOR_REGEX = /\\/g;
const FILE_EXTENSION_REGEX = /\.(ts|js|tsx|jsx)$/;

/**
 * Starts the onboarding process to set up c15t configuration
 *
 * @param context - CLI context
 * @param existingConfig - Optional existing configuration
 */
export async function startOnboarding(
	context: CliContext,
	existingConfig?: C15TOptions | ConsentManagerOptions | null
) {
	const { logger, telemetry } = context;
	const isUpdate = !!existingConfig;

	const handleCancel = (value: unknown): value is symbol => {
		if (p.isCancel(value)) {
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_EXITED, {
				reason: 'user_cancelled',
				stage: 'setup',
			});
			context.error.handleCancel('Configuration cancelled.');
			return true;
		}
		return false;
	};

	try {
		logger.info(
			isUpdate
				? 'Starting configuration update...'
				: 'Starting onboarding process...'
		);
		telemetry.trackEvent(
			isUpdate
				? TelemetryEventName.CONFIG_UPDATED
				: TelemetryEventName.ONBOARDING_STARTED,
			{ isUpdate }
		);
		telemetry.flushSync();

		await performOnboarding(context, existingConfig, handleCancel);

		logger.success('🚀 Setup completed successfully!');
	} catch (error) {
		if (!p.isCancel(error)) {
			logger.error('An unexpected error occurred during onboarding:', error);
			if (error instanceof Error && error.message) {
				logger.error(`Error details: ${error.message}`);
			}
			logger.failed('Onboarding process could not be completed.');
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

/**
 * Performs the core onboarding setup steps
 */
async function performOnboarding(
	context: CliContext,
	existingConfig: C15TOptions | ConsentManagerOptions | null | undefined,
	handleCancel: (value: unknown) => value is symbol
) {
	const { telemetry, logger } = context;
	const isUpdate = !!existingConfig;

	const projectRoot = await detectProjectRoot(context.cwd, logger);
	const packageManager = await detectPackageManager(projectRoot, logger);
	const { pkg } = await detectFramework(projectRoot, logger);

	if (!pkg) {
		throw new Error('Error detecting framework');
	}

	const storageMode = await handleStorageModeSelection(
		context,
		handleCancel,
		existingConfig
	);

	if (!storageMode) {
		return;
	}

	const dependenciesToAdd: string[] = [pkg];

	// Handle storage mode setup
	switch (storageMode) {
		case 'c15t': {
			const initialBackendURL =
				isUpdate && existingConfig && isClientOptions(existingConfig)
					? existingConfig.backendURL
					: undefined;
			const c15tResult = await setupC15tMode({
				context,
				projectRoot,
				spinner: p.spinner(),
				packageName: pkg,
				initialBackendURL,
				handleCancel,
			});
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_C15T_MODE_CONFIGURED, {
				usingEnvFile: c15tResult.usingEnvFile,
				hasInitialBackendURL: !!initialBackendURL,
			});
			break;
		}
		case 'offline': {
			await setupOfflineMode({
				context,
				projectRoot,
				spinner: p.spinner(),
				pkg,
			});
			telemetry.trackEvent(
				TelemetryEventName.ONBOARDING_OFFLINE_MODE_CONFIGURED,
				{}
			);
			break;
		}
		case 'self-hosted': {
			const selfHostedResult = await setupSelfHostedMode(
				context,
				projectRoot,
				p.spinner(),
				handleCancel
			);
			dependenciesToAdd.push(...selfHostedResult.dependencies);
			telemetry.trackEvent(
				TelemetryEventName.ONBOARDING_SELF_HOSTED_CONFIGURED,
				{
					databaseType: selfHostedResult.adapterChoice,
					dependencies: selfHostedResult.dependencies.join(','),
				}
			);
			break;
		}
		default: {
			await setupCustomMode({
				context,
				projectRoot,
				spinner: p.spinner(),
				pkg,
			});
			telemetry.trackEvent(
				TelemetryEventName.ONBOARDING_CUSTOM_MODE_CONFIGURED,
				{}
			);
			break;
		}
	}

	const { installDepsConfirmed, ranInstall } =
		await handleDependencyInstallation(
			context,
			projectRoot,
			dependenciesToAdd,
			packageManager,
			handleCancel,
			isUpdate
		);

	await displayNextSteps({
		context,
		projectRoot,
		storageMode,
		installDepsConfirmed,
		ranInstall,
		dependenciesToAdd,
		packageManager,
	});
	await handleGitHubStar(context);

	telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
		success: true,
		storageMode,
		installDependencies: ranInstall,
	});
}

async function handleStorageModeSelection(
	context: CliContext,
	handleCancel: (value: unknown) => boolean,
	existingConfig?: C15TOptions | ConsentManagerOptions | null
) {
	const { telemetry } = context;
	const initialStorageMode = getInitialStorageMode(existingConfig);

	const storageModeSelection = await p.select<string | symbol | undefined>({
		message: existingConfig
			? `Select storage mode (current: ${initialStorageMode || 'unknown'}):`
			: 'How would you like to store consent decisions?',
		initialValue: initialStorageMode || 'c15t',
		options: [
			{
				value: 'c15t',
				label: 'Hosted c15t (consent.io)',
				hint: 'Recommended: Fully managed service',
			},
			{
				value: 'offline',
				label: 'Offline Mode',
				hint: 'Store in browser, no backend needed',
			},
			{
				value: 'self-hosted',
				label: 'Self-Hosted',
				hint: 'Run your own c15t backend',
			},
			{
				value: 'custom',
				label: 'Custom Implementation',
				hint: 'Full control over storage logic',
			},
		],
	});

	if (handleCancel(storageModeSelection)) {
		return null;
	}

	const storageMode = storageModeSelection as string;
	telemetry.trackEvent(TelemetryEventName.ONBOARDING_STORAGE_MODE_SELECTED, {
		storageMode,
		isUpdate: !!existingConfig,
	});

	return storageMode;
}

async function handleDependencyInstallation(
	context: CliContext,
	projectRoot: string,
	dependenciesToAdd: string[],
	packageManager: PackageManagerResult,
	handleCancel: (value: unknown) => boolean,
	isUpdate: boolean
) {
	const { telemetry, logger } = context;
	const s = p.spinner();

	if (dependenciesToAdd.length === 0) {
		return { installDepsConfirmed: false, ranInstall: false };
	}

	const depsString = dependenciesToAdd.map((d) => color.cyan(d)).join(', ');
	const addDepsSelection = await p.confirm({
		message: `${isUpdate ? 'Update' : 'Add'} required dependencies using ${color.cyan(packageManager.name)}? (${depsString})`,
		initialValue: true,
	});

	if (handleCancel(addDepsSelection)) {
		return { installDepsConfirmed: false, ranInstall: false };
	}

	if (!addDepsSelection) {
		return { installDepsConfirmed: false, ranInstall: false };
	}

	s.start(
		`Running ${color.cyan(packageManager.name)} to add and install dependencies... (this might take a moment)`
	);
	try {
		await addAndInstallDependenciesViaPM(
			projectRoot,
			dependenciesToAdd,
			packageManager.name
		);
		s.stop(
			`✅ Dependencies installed: ${dependenciesToAdd.map((d) => color.cyan(d)).join(', ')}`
		);
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_INSTALLED, {
			success: true,
			dependencies: dependenciesToAdd.join(','),
			packageManager: packageManager.name,
		});

		return { installDepsConfirmed: true, ranInstall: true };
	} catch (installError) {
		s.stop(color.yellow('⚠️ Dependency installation failed.'));
		logger.error('Installation Error:', installError);
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_INSTALLED, {
			success: false,
			error:
				installError instanceof Error
					? installError.message
					: String(installError),
			dependencies: dependenciesToAdd.join(','),
			packageManager: packageManager.name,
		});
		const pmCommand = getManualInstallCommand(
			dependenciesToAdd,
			packageManager.name
		);
		logger.info(
			`Please try running '${pmCommand}' manually in ${color.cyan(path.relative(context.cwd, projectRoot))}.`
		);
		return { installDepsConfirmed: true, ranInstall: false };
	}
}

function getInitialStorageMode(
	config?: C15TOptions | ConsentManagerOptions | null
): string | undefined {
	if (!config) {
		return undefined;
	}

	if ('mode' in config) {
		return isClientOptions(config) ? config.mode : 'c15t';
	}
	return undefined;
}

interface DisplayNextStepsOptions {
	context: CliContext;
	projectRoot: string;
	storageMode: string;
	installDepsConfirmed: boolean;
	ranInstall: boolean;
	dependenciesToAdd: string[];
	packageManager: PackageManagerResult;
}

async function displayNextSteps(options: DisplayNextStepsOptions) {
	const {
		context,
		projectRoot,
		storageMode,
		installDepsConfirmed,
		ranInstall,
		dependenciesToAdd,
		packageManager,
	} = options;
	const { logger, cwd } = context;
	const { log } = p;

	const configPath = path.join(projectRoot, 'c15t.config.ts');
	const backendConfigPath = path.join(projectRoot, 'c15t.backend.ts');
	const relativeConfigPath = path.relative(cwd, configPath);

	// Generate import path relative to cwd, removing extension
	const importPath = `./${relativeConfigPath.replace(WINDOWS_PATH_SEPARATOR_REGEX, '/').replace(FILE_EXTENSION_REGEX, '')}`;
	const importStatement = color.cyan(
		`import { c15tConfig } from '${importPath}';`
	);

	// Mode-specific guidance
	// biome-ignore lint/style/useDefaultSwitchClause: <explanation>
	switch (storageMode) {
		case 'c15t': {
			break;
		}
		case 'offline': {
			break;
		}
		case 'self-hosted': {
			log.step('Configuration Complete! Next Steps:');
			let steps = '';
			try {
				await fs.access(backendConfigPath);
				steps += `1. Configure database connection in ${color.cyan(path.relative(cwd, backendConfigPath))}.\n`;
				steps +=
					'      2. Set up API routes using the exported backend instance.\n';
			} catch {
				steps += '1. Set up your c15t backend instance and API routes.\n';
			}
			steps += `3. Ensure ${color.cyan('backendURL')} in ${color.cyan(relativeConfigPath)} points to your API.\n`;
			logger.info(steps);
			break;
		}
		case 'custom': {
			log.step('Configuration Complete! Next Steps:');
			const steps =
				`1. Implement your custom endpoint handlers (referenced in ${color.cyan(relativeConfigPath)}).\n` +
				`      2. Import and use configuration in your app: ${importStatement}`;
			logger.info(steps);
			break;
		}
	}

	// Adjust final reminder messages based on install outcome
	if (installDepsConfirmed && !ranInstall) {
		// User agreed to install, but it failed
		logger.info(
			`  - ${color.yellow('Dependency installation failed.')} Please check errors and install manually.`
		);
	} else if (!ranInstall && dependenciesToAdd.length > 0) {
		// User explicitly declined installation step
		const pmCommand = getManualInstallCommand(
			dependenciesToAdd,
			packageManager.name
		);
		logger.warn(
			`  - Run ${color.cyan(pmCommand)} to install required dependencies.`
		);
	}
}

async function handleGitHubStar(context: CliContext) {
	const { logger, telemetry } = context;

	// Create completion message with GitHub star request
	logger.note(
		`${color.bold('✨ Setup complete!')} Your c15t configuration is ready to use. \n

We're building c15t as an ${color.bold('open source')} project to make consent management more accessible.
If you find this useful, we'd really appreciate a GitHub star - it helps others discover the project!`,
		'🎉 Thanks for using c15t'
	);

	// Add GitHub star request
	const shouldOpenGithub = await p.confirm({
		message: 'Would you like to star c15t on GitHub now?',
		initialValue: true,
	});

	if (p.isCancel(shouldOpenGithub)) {
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_GITHUB_STAR, {
			action: 'cancelled',
		});
		return context.error.handleCancel(
			'GitHub star prompt cancelled. Exiting onboarding.'
		);
	}

	telemetry.trackEvent(TelemetryEventName.ONBOARDING_GITHUB_STAR, {
		action: shouldOpenGithub ? 'opened_browser' : 'declined',
	});

	if (shouldOpenGithub) {
		try {
			p.note(
				'Your support helps us continue improving c15t.\nThank you for being part of our community!',
				'⭐ Star Us on GitHub'
			);
			await open('https://github.com/c15t/c15t');
			logger.success('GitHub repository opened. Thank you for your support!');
		} catch (error) {
			logger.debug('Failed to open browser:', error);
			logger.info(
				`You can star us later by visiting: ${color.cyan('https://github.com/c15t/c15t')}`
			);
		}
	}
}
