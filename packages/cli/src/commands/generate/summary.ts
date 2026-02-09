/**
 * Summary displays for the generate command
 *
 * Shows execution plan before changes and completion summary after.
 */

import * as p from '@clack/prompts';
import color from 'picocolors';
import type { PackageManagerResult } from '~/context/package-manager-detection';
import type { CliContext } from '~/context/types';
import { STORAGE_MODES, type StorageMode, URLS } from '../../constants';
import { getModeInfo } from './prompts/mode-select';

/**
 * Execution plan
 */
export interface ExecutionPlan {
	mode: StorageMode;
	backendUrl?: string;
	filesToCreate: string[];
	filesToModify: string[];
	dependencies: string[];
	devDependencies?: string[];
}

/**
 * Display the execution plan and ask for confirmation
 */
export async function displayExecutionPlan(
	context: CliContext,
	plan: ExecutionPlan
): Promise<boolean> {
	const { logger, flags } = context;

	const modeInfo = getModeInfo(plan.mode);

	logger.message('');
	logger.message(color.bold('Execution Plan'));
	logger.message(color.dim('─'.repeat(40)));
	logger.message('');

	// Mode
	logger.message(`${color.cyan('Mode:')} ${modeInfo?.label || plan.mode}`);
	if (plan.backendUrl) {
		logger.message(`${color.cyan('Backend URL:')} ${plan.backendUrl}`);
	}
	logger.message('');

	// Files to create
	if (plan.filesToCreate.length > 0) {
		logger.message(color.green('Files to create:'));
		for (const file of plan.filesToCreate) {
			logger.message(`  ${color.green('+')} ${file}`);
		}
		logger.message('');
	}

	// Files to modify
	if (plan.filesToModify.length > 0) {
		logger.message(color.yellow('Files to modify:'));
		for (const file of plan.filesToModify) {
			logger.message(`  ${color.yellow('~')} ${file}`);
		}
		logger.message('');
	}

	// Dependencies
	if (plan.dependencies.length > 0) {
		logger.message(color.blue('Dependencies to install:'));
		for (const dep of plan.dependencies) {
			logger.message(`  ${color.blue('•')} ${dep}`);
		}
		logger.message('');
	}

	if (plan.devDependencies && plan.devDependencies.length > 0) {
		logger.message(color.blue('Dev dependencies to install:'));
		for (const dep of plan.devDependencies) {
			logger.message(`  ${color.blue('•')} ${dep}`);
		}
		logger.message('');
	}

	logger.message(color.dim('─'.repeat(40)));
	logger.message('');

	// Skip confirmation if -y flag
	if (flags.y === true || flags.yes === true) {
		return true;
	}

	const confirmed = await p.confirm({
		message: 'Proceed with these changes?',
		initialValue: true,
	});

	if (p.isCancel(confirmed)) {
		return false;
	}

	return confirmed;
}

/**
 * Display completion summary
 */
export function displayCompletionSummary(
	context: CliContext,
	options: {
		mode: StorageMode;
		backendUrl?: string;
		filesCreated: string[];
		filesModified: string[];
		dependenciesInstalled: boolean;
	}
): void {
	const { logger, framework } = context;
	const packageManager = context.packageManager as PackageManagerResult;
	const {
		mode,
		backendUrl,
		filesCreated,
		filesModified,
		dependenciesInstalled,
	} = options;

	logger.message('');
	logger.success('c15t setup complete!');
	logger.message('');

	// Files created/modified summary
	if (filesCreated.length > 0 || filesModified.length > 0) {
		logger.message(color.bold('Changes made:'));
		for (const file of filesCreated) {
			logger.message(`  ${color.green('+ Created')} ${file}`);
		}
		for (const file of filesModified) {
			logger.message(`  ${color.yellow('~ Modified')} ${file}`);
		}
		logger.message('');
	}

	// Next steps based on mode
	logger.message(color.bold('Next steps:'));
	logger.message('');

	const steps = getNextSteps(mode, {
		framework: framework.framework,
		backendUrl,
		dependenciesInstalled,
		packageManager: packageManager.name,
	});

	for (let i = 0; i < steps.length; i++) {
		logger.message(`  ${color.cyan(`${i + 1}.`)} ${steps[i]}`);
	}

	logger.message('');

	// Resources
	logger.message(color.bold('Resources:'));
	logger.message(
		`  ${color.dim('•')} Documentation: ${color.underline(URLS.DOCS)}`
	);
	logger.message(
		`  ${color.dim('•')} Discord: ${color.underline(URLS.DISCORD)}`
	);
	logger.message(`  ${color.dim('•')} GitHub: ${color.underline(URLS.GITHUB)}`);
	logger.message('');

	// Verification
	logger.message(
		color.dim('Run your app to see the consent banner in action!')
	);
}

/**
 * Get next steps based on mode
 */
function getNextSteps(
	mode: StorageMode,
	options: {
		framework: string | null;
		backendUrl?: string;
		dependenciesInstalled: boolean;
		packageManager: string;
	}
): string[] {
	const { framework, backendUrl, dependenciesInstalled, packageManager } =
		options;
	const steps: string[] = [];

	// Install dependencies if not done
	if (!dependenciesInstalled) {
		steps.push(
			`Install dependencies: ${color.cyan(`${packageManager} install`)}`
		);
	}

	// Mode-specific steps
	switch (mode) {
		case STORAGE_MODES.C15T:
			if (backendUrl?.includes('your-instance')) {
				steps.push(
					`Update ${color.cyan('c15t.config.ts')} with your actual instance URL`
				);
			}
			steps.push('Wrap your app with the ConsentManager component');
			break;

		case STORAGE_MODES.OFFLINE:
			steps.push('Wrap your app with the ConsentManager component');
			steps.push('Customize consent categories in the config');
			break;

		case STORAGE_MODES.SELF_HOSTED:
			steps.push(`Set up your c15t backend server`);
			steps.push(
				`Update ${color.cyan('c15t.config.ts')} with your backend URL`
			);
			steps.push('Wrap your app with the ConsentManager component');
			break;

		case STORAGE_MODES.CUSTOM:
			steps.push(
				`Implement the endpoint handlers in ${color.cyan('c15t.config.ts')}`
			);
			steps.push('Wrap your app with the ConsentManager component');
			break;
	}

	// Framework-specific steps
	if (framework === 'Next.js') {
		steps.push(`Add the ConsentManager to your layout or _app file`);
	} else if (framework === 'React' || framework === 'Vite + React') {
		steps.push(`Import ConsentManager in your App.tsx/main.tsx`);
	}

	// Common steps
	steps.push('Test the consent banner in your development environment');
	steps.push('Customize the banner appearance and messaging');

	return steps;
}

/**
 * Display GitHub star prompt
 */
export async function promptGitHubStar(context: CliContext): Promise<void> {
	const { logger, telemetry } = context;

	logger.message('');
	logger.message(color.dim('─'.repeat(40)));
	logger.message('');

	const shouldStar = await p.confirm({
		message: `If c15t helps you, consider starring us on GitHub! ${color.dim('(Opens browser)')}`,
		initialValue: false,
	});

	if (shouldStar && !p.isCancel(shouldStar)) {
		const open = await import('open');
		await open.default(URLS.GITHUB);
		telemetry.trackEvent('onboarding.github_star', { clicked: true });
		logger.info('Thanks for your support!');
	}
}
