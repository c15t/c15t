import path from 'node:path';
import * as p from '@clack/prompts';
import open from 'open';
import color from 'picocolors';
import {
	detectFramework,
	detectProjectRoot,
} from '~/context/framework-detection';
import type { PackageManagerResult } from '~/context/package-manager-detection';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';
import { setupC15tMode } from './options/c15t-mode';
import { setupCustomMode } from './options/custom-mode';
import { setupOfflineMode } from './options/offline-mode';
import { setupSelfHostedMode } from './options/self-hosted-mode';
import type { BaseOptions } from './options/types';
import { getManualInstallCommand } from './options/utils/dependencies';

const WINDOWS_PATH_SEPARATOR_REGEX = /\\/g;
const FILE_EXTENSION_REGEX = /\.(ts|js|tsx|jsx)$/;

/**
 * Generate command - loads config, allows updating via onboarding, then generates artifacts.
 */
export async function generate(context: CliContext, mode?: string) {
	const { logger, telemetry } = context;
	logger.debug('Starting generate command...');
	logger.debug(`Mode: ${mode}`);

	const handleCancel = (value: unknown): value is symbol => {
		if (p.isCancel(value)) {
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_EXITED, {
				reason: 'user_cancelled',
				command: 'onboarding',
				stage: 'setup',
			});
			context.error.handleCancel('Configuration cancelled.', {
				command: 'onboarding',
				stage: 'setup',
			});
		}
		return false;
	};

	try {
		logger.info('Starting onboarding process...');
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_STARTED, {});
		telemetry.flushSync();

		await performOnboarding(context, handleCancel, mode);

		logger.success('🚀 Setup completed successfully!');
	} catch (error) {
		if (!p.isCancel(error)) {
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
	handleCancel: (value: unknown) => value is symbol,
	mode?: string
) {
	const { telemetry, logger, packageManager } = context;

	const projectRoot = await detectProjectRoot(context.cwd, logger);
	const { pkg } = await detectFramework(projectRoot, logger);

	if (!pkg) {
		throw new Error('Error detecting framework');
	}

	let selectedMode = mode ?? null;

	logger.debug(`Selected mode: ${selectedMode}`);

	if (!selectedMode) {
		selectedMode = await handleStorageModeSelection(context, handleCancel);
	}

	if (!selectedMode) {
		return;
	}

	const sharedOptions: BaseOptions = {
		context,
		spinner: p.spinner(),
		handleCancel,
	};

	let installDepsConfirmed = false;
	let ranInstall = false;
	const dependenciesToAdd: string[] = [];

	// Handle storage mode setup
	switch (selectedMode) {
		case 'c15t': {
			const c15tResult = await setupC15tMode(sharedOptions);

			installDepsConfirmed = c15tResult.installDepsConfirmed;
			ranInstall = c15tResult.ranInstall;
			dependenciesToAdd.push(context.framework.pkg);

			telemetry.trackEvent(TelemetryEventName.ONBOARDING_C15T_MODE_CONFIGURED, {
				usingEnvFile: c15tResult.usingEnvFile,
				proxyNextjs: c15tResult.proxyNextjs,
			});
			break;
		}
		case 'offline': {
			const offlineResult = await setupOfflineMode({
				context,
				spinner: p.spinner(),
			});

			installDepsConfirmed = offlineResult.installDepsConfirmed;
			ranInstall = offlineResult.ranInstall;
			dependenciesToAdd.push(context.framework.pkg);

			telemetry.trackEvent(
				TelemetryEventName.ONBOARDING_OFFLINE_MODE_CONFIGURED,
				{}
			);
			break;
		}
		case 'self-hosted': {
			const selfHostedResult = await setupSelfHostedMode({
				context,
				spinner: p.spinner(),
				handleCancel,
			});

			installDepsConfirmed = selfHostedResult.installDepsConfirmed;
			ranInstall = selfHostedResult.ranInstall;
			dependenciesToAdd.push(context.framework.pkg);

			telemetry.trackEvent(
				TelemetryEventName.ONBOARDING_SELF_HOSTED_CONFIGURED,
				{}
			);
			break;
		}
		default: {
			const customResult = await setupCustomMode({
				context,
				spinner: p.spinner(),
			});

			installDepsConfirmed = customResult.installDepsConfirmed;
			ranInstall = customResult.ranInstall;
			dependenciesToAdd.push(context.framework.pkg);

			telemetry.trackEvent(
				TelemetryEventName.ONBOARDING_CUSTOM_MODE_CONFIGURED,
				{}
			);
			break;
		}
	}

	await displayNextSteps({
		context,
		projectRoot,
		storageMode: selectedMode,
		installDepsConfirmed,
		ranInstall,
		dependenciesToAdd,
		packageManager,
	});
	await handleGitHubStar(context);

	telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
		success: true,
		selectedMode,
		installDependencies: ranInstall,
	});
}

async function handleStorageModeSelection(
	context: CliContext,
	handleCancel: (value: unknown) => boolean
) {
	const { telemetry } = context;

	const storageModeSelection = await p.select<string | symbol | undefined>({
		message: 'How would you like to store consent decisions?',
		initialValue: 'c15t',
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
	});

	return storageMode;
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
	const relativeConfigPath = path.relative(cwd, configPath);

	// Generate import path relative to cwd, removing extension
	const importPath = `./${relativeConfigPath.replace(WINDOWS_PATH_SEPARATOR_REGEX, '/').replace(FILE_EXTENSION_REGEX, '')}`;
	const importStatement = color.cyan(
		`import { c15tConfig } from '${importPath}';`
	);

	// Mode-specific guidance
	switch (storageMode) {
		case 'c15t': {
			break;
		}
		case 'offline': {
			break;
		}
		case 'self-hosted': {
			log.step('Setup your backend with the c15t docs:');
			logger.info('https://c15t.com/docs/self-host/v2');
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
	const shouldOpenGitHub = await p.confirm({
		message: 'Would you like to star c15t on GitHub now?',
		initialValue: true,
	});

	if (p.isCancel(shouldOpenGitHub)) {
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_GITHUB_STAR, {
			action: 'cancelled',
		});
		return context.error.handleCancel(
			'GitHub star prompt cancelled. Exiting onboarding.',
			{
				command: 'onboarding',
				stage: 'github_star',
			}
		);
	}

	telemetry.trackEvent(TelemetryEventName.ONBOARDING_GITHUB_STAR, {
		action: shouldOpenGitHub ? 'opened_browser' : 'declined',
	});

	if (shouldOpenGitHub) {
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
