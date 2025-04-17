import fs from 'node:fs/promises';
import path from 'node:path';
import type { C15TOptions } from '@c15t/backend';
import type { ConsentManagerOptions } from '@c15t/react';
import * as p from '@clack/prompts';
import open from 'open';
import color from 'picocolors';

import {
	isC15TOptions,
	isClientOptions,
} from '../actions/get-config/config-extraction';
import type { CliContext } from '../context/types';
import { formatLogMessage } from '../utils/logger';
import { TelemetryEventName } from '../utils/telemetry';

import {
	addAndInstallDependenciesViaPM,
	getManualInstallCommand,
} from './dependencies';
import {
	detectFramework,
	detectPackageManager,
	detectProjectRoot,
} from './detection';
import {
	setupC15tMode,
	setupCustomMode,
	setupOfflineMode,
	setupSelfHostedMode,
} from './storage-modes';

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
	const { logger, cwd, telemetry } = context;

	// Helper function to handle cancellations
	const handleCancel = (value: unknown): value is symbol => {
		if (p.isCancel(value)) {
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_EXITED, {
				reason: 'user_cancelled',
				stage: 'setup'
			});
			context.error.handleCancel('Configuration cancelled.');
			return true; // Indicates cancellation occurred
		}
		return false;
	};

	const isUpdate = !!existingConfig;
	logger.info(
		isUpdate
			? 'Starting configuration update...'
			: 'Starting onboarding process...'
	);

	// Track onboarding start
	telemetry.trackEvent(
		isUpdate ? TelemetryEventName.CONFIG_UPDATED : TelemetryEventName.ONBOARDING_STARTED, 
		{ isUpdate }
	);

	logger.note(
		isUpdate
			? `Let's update your c15t configuration.`
			: `Welcome to c15t! Let's set up your consent management configuration.\nFirst, we'll help you choose the best storage approach for your needs.`,
		isUpdate ? 'Update Configuration' : 'First time setup'
	);

	// --- Project Root Detection ---
	const projectRoot = await detectProjectRoot(cwd);
	if (projectRoot !== cwd) {
		logger.debug(`Project root identified: ${projectRoot}`);
	} else {
		logger.warn('Could not determine project root, using current directory');
	}

	// --- Environment Detection ---
	const s = p.spinner();
	let spinnerActive = false;

	try {
		// Detect package manager and framework
		const packageManager = await detectPackageManager(projectRoot);
		const { framework, hasReact } = await detectFramework(projectRoot);

		logger.debug(`Detected package manager: ${packageManager}`);
		if (framework) {
			logger.debug(`Detected framework: ${framework}`);
		}
		logger.debug(`React detected: ${hasReact}`);

		// Track environment detection
		telemetry.trackEvent(TelemetryEventName.CLI_ENVIRONMENT_DETECTED, {
			packageManager,
			framework: framework || 'unknown',
			hasReact
		});

		// --- 1. Select Storage Mode ---
		let initialStorageMode: string | undefined;
		if (isUpdate && existingConfig && 'mode' in existingConfig) {
			// Determine initial mode from existing config
			if (isClientOptions(existingConfig)) {
				initialStorageMode = existingConfig.mode;
			} else if (isC15TOptions(existingConfig)) {
				// Default to c15t if it's a backend config during update
				initialStorageMode = 'c15t';
			}
		}

		let storageModeSelection: string | symbol | undefined;
		try {
			storageModeSelection = await p.select<string | symbol | undefined>({
				message: isUpdate
					? `Select storage mode (current: ${initialStorageMode || 'unknown'}):`
					: 'How would you like to store consent decisions?',
				initialValue: initialStorageMode || 'c15t', // Use existing or default
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
		} catch (error) {
			logger.error('Error selecting storage mode:', error);
			throw error;
		}
		if (handleCancel(storageModeSelection)) return;
		const storageMode = storageModeSelection as string;
		logger.debug(`Selected storage mode: ${storageMode}`);

		// Track storage mode selection
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_STORAGE_MODE_SELECTED, {
			storageMode,
			isUpdate
		});

		// --- Variables for collected data and actions ---
		let clientConfigContent: string | null = null;
		let backendConfigContent: string | null = null;
		const dependenciesToAdd: string[] = [];
		let installDepsConfirmed = false;
		let ranInstall = false;

		// --- Determine Base Dependencies ---
		if (hasReact) {
			dependenciesToAdd.push('@c15t/react');
		} else {
			dependenciesToAdd.push('c15t'); // Base package
			if (framework === null) {
				logger.note(
					`No React framework detected, installing base c15t package.\nIf you're using React, you might need to manually install @c15t/react instead.`,
					formatLogMessage('warn', 'Package Selection')
				);
			}
		}

		// --- 2. Mode-Specific Questions & File Creation ---
		if (storageMode === 'c15t') {
			// Handle c15t mode
			let initialBackendURL: string | undefined;
			// Check for existing URL in config
			if (
				isUpdate &&
				existingConfig &&
				isClientOptions(existingConfig) &&
				existingConfig.backendURL
			) {
				initialBackendURL = existingConfig.backendURL;
			}

			const c15tResult = await setupC15tMode(
				context,
				projectRoot,
				s,
				initialBackendURL,
				handleCancel
			);

			clientConfigContent = c15tResult.clientConfigContent;
			
			// Track c15t mode details
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_C15T_MODE_CONFIGURED, {
				usingEnvFile: c15tResult.usingEnvFile,
				hasInitialBackendURL: !!initialBackendURL
			});
		} else if (storageMode === 'offline') {
			// Handle offline mode
			const offlineResult = await setupOfflineMode(
				context,
				projectRoot,
				s,
				handleCancel
			);

			clientConfigContent = offlineResult.clientConfigContent;
			
			// Track offline mode setup
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_OFFLINE_MODE_CONFIGURED, {});
		} else if (storageMode === 'self-hosted') {
			// Handle self-hosted mode
			const selfHostedResult = await setupSelfHostedMode(
				context,
				projectRoot,
				s,
				handleCancel
			);

			clientConfigContent = selfHostedResult.clientConfigContent;
			backendConfigContent = selfHostedResult.backendConfigContent;
			dependenciesToAdd.push(...selfHostedResult.dependencies);
			
			// Track self-hosted mode details
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_SELF_HOSTED_CONFIGURED, {
				databaseType: selfHostedResult.adapterChoice,
				dependencies: selfHostedResult.dependencies.join(',')
			});
		} else if (storageMode === 'custom') {
			// Handle custom mode
			const customResult = await setupCustomMode(context, projectRoot, s);

			clientConfigContent = customResult.clientConfigContent;
			
			// Track custom mode setup
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_CUSTOM_MODE_CONFIGURED, {});
		}

		// --- 3. Handle Dependencies ---
		let addDeps = false; // Initialize with default value
		if (dependenciesToAdd.length > 0) {
			const depsString = dependenciesToAdd
				.map((d) => color.cyan(`${d}@workspace:*`))
				.join(', ');

			const addDepsSelection = await p.confirm({
				message: `${isUpdate ? 'Update' : 'Add'} required dependencies using ${color.cyan(packageManager)}? (${depsString})`,
				initialValue: true,
			});

			if (handleCancel(addDepsSelection)) return;
			addDeps = addDepsSelection as boolean;

			// Track dependency confirmation
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_CHOICE, {
				confirmed: addDeps,
				dependencies: dependenciesToAdd.join(','),
				packageManager
			});

			if (addDeps) {
				installDepsConfirmed = true; // Track confirmation
				s.start(
					`Running ${color.cyan(packageManager)} to add and install dependencies... (this might take a moment)`
				);
				spinnerActive = true;
				try {
					await addAndInstallDependenciesViaPM(
						projectRoot,
						dependenciesToAdd,
						packageManager
					);
					s.stop(
						`✅ Dependencies installed: ${dependenciesToAdd.map((d) => color.cyan(d)).join(', ')}`
					);
					spinnerActive = false;
					ranInstall = true; // Track success
					
					// Track successful installation
					telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_INSTALLED, {
						success: true,
						dependencies: dependenciesToAdd.join(','),
						packageManager
					});
				} catch (installError) {
					s.stop(color.yellow('⚠️ Dependency installation failed.'));
					spinnerActive = false;
					logger.error('Installation Error:', installError);

					// Track failed installation
					telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_INSTALLED, {
						success: false,
						error: installError instanceof Error ? installError.message : String(installError),
						dependencies: dependenciesToAdd.join(','),
						packageManager
					});

					// Give specific command for manual execution
					const pmCommand = getManualInstallCommand(
						dependenciesToAdd,
						packageManager
					);
					logger.info(
						`Please try running '${pmCommand}' manually in ${color.cyan(path.relative(cwd, projectRoot))}.`
					);
				}
			}
		}

		// --- 4. Final Steps Guidance ---
		p.log.step('Configuration Complete! Next Steps:');

		const configPath = path.join(projectRoot, 'c15t.config.ts');
		const backendConfigPath = path.join(projectRoot, 'c15t.backend.ts');
		const relativeConfigPath = path.relative(cwd, configPath);

		// Generate import path relative to cwd, removing extension
		const importPath = `./${relativeConfigPath.replace(/\\/g, '/').replace(/\.(ts|js|tsx|jsx)$/, '')}`;
		const importStatement = color.cyan(
			`import { c15tConfig } from '${importPath}';`
		);

		// Mode-specific guidance
		// biome-ignore lint/style/useDefaultSwitchClause: <explanation>
		switch (storageMode) {
			case 'c15t': {
				let steps =
					'1. Ensure your consent.io instance is configured (trusted origins etc).\n';
				try {
					await fs.access(path.join(projectRoot, '.env.local'));
					steps += `      2. Verify ${color.cyan('NEXT_PUBLIC_C15T_URL')} in ${color.cyan(path.relative(cwd, path.join(projectRoot, '.env.local')))}.\n`;
				} catch {
					steps += `      2. Verify ${color.cyan('backendURL')} in ${color.cyan(relativeConfigPath)}.\n`;
				}
				steps += `      3. Import and use configuration in your app: ${importStatement}`;
				logger.info(steps);
				break;
			}
			case 'offline': {
				logger.info(
					`1. Import and use configuration in your app: ${importStatement}`
				);
				break;
			}
			case 'self-hosted': {
				let steps = '';
				try {
					await fs.access(backendConfigPath);
					steps += `1. Configure database connection in ${color.cyan(path.relative(cwd, backendConfigPath))}.\n`;
					steps +=
						'      2. Set up API routes using the exported backend instance.\n';
				} catch {
					steps += '1. Set up your c15t backend instance and API routes.\n';
				}
				steps += `      3. Ensure ${color.cyan('backendURL')} in ${color.cyan(relativeConfigPath)} points to your API.\n`;
				steps += `      4. Import and use client configuration: ${importStatement}`;
				logger.info(steps);
				break;
			}
			case 'custom': {
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
		} else if (!addDeps && dependenciesToAdd.length > 0) {
			// User explicitly declined installation step
			const pmCommand = getManualInstallCommand(
				dependenciesToAdd,
				packageManager
			);
			logger.warn(
				`  - Run ${color.cyan(pmCommand)} to install required dependencies.`
			);
		}

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
			// Handle cancellation consistently with other parts of the onboarding
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_GITHUB_STAR, {
				action: 'cancelled'
			});
			return context.error.handleCancel(
				'GitHub star prompt cancelled. Exiting onboarding.'
			);
		}

		// Track GitHub star choice
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_GITHUB_STAR, {
			action: shouldOpenGithub ? 'opened_browser' : 'declined'
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

		// Track onboarding completion
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
			success: true,
			storageMode,
			installDependencies: ranInstall
		});

		// Final success message
		logger.success('🚀 Setup completed successfully!');
	} catch (error) {
		// Ensure spinner stops on error
		if (spinnerActive) {
			s.stop(color.red('Onboarding failed.'));
		}
		// Avoid logging cancellation messages as errors
		if (!p.isCancel(error)) {
			logger.error('An unexpected error occurred during onboarding:', error);
			if (error instanceof Error && error.message) {
				logger.error(`Error details: ${error.message}`);
			}
			logger.failed('Onboarding process could not be completed.');
			
			// Track onboarding failure
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
}
