import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';

// Define PackageManager type here since the import isn't working
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Installs dependencies using the detected package manager
 *
 * @param projectRoot - The root directory of the project
 * @param dependencies - Array of package names to install
 * @param packageManager - The package manager to use (npm, yarn, pnpm)
 * @returns Promise that resolves when installation is complete
 */
export async function addAndInstallDependenciesViaPM(
	projectRoot: string,
	dependencies: string[],
	packageManager: PackageManager
): Promise<void> {
	if (dependencies.length === 0) {
		// Nothing to add
		return;
	}

	let command = '';
	let args: string[] = [];

	switch (packageManager) {
		case 'npm': {
			command = 'npm';
			args = ['install', ...dependencies];
			break;
		}
		case 'yarn': {
			command = 'yarn';
			args = ['add', ...dependencies];
			break;
		}
		case 'pnpm': {
			command = 'pnpm';
			args = ['add', ...dependencies];
			break;
		}
		default:
			throw new Error(
				`Unsupported package manager for dependency addition: ${packageManager}`
			);
	}

	// Execute the command with spawn to prevent shell injection
	const child = spawn(command, args, {
		cwd: projectRoot,
		stdio: 'inherit',
	});

	await once(child, 'exit');
}

/**
 * Generates the package manager command for manual installation
 * Useful when automatic installation fails
 *
 * @param dependencies - Array of package names
 * @param packageManager - The package manager to use
 * @returns The command string to run for manual installation
 */
export function getManualInstallCommand(
	dependencies: string[],
	packageManager: PackageManager
): string {
	switch (packageManager) {
		case 'npm':
			return `npm install ${dependencies.join(' ')}`;
		case 'yarn':
			return `yarn add ${dependencies.join(' ')}`;
		case 'pnpm':
			return `pnpm add ${dependencies.join(' ')}`;
		default:
			return `npm install ${dependencies.join(' ')}`;
	}
}

interface InstallDependenciesOptions {
	context: CliContext;
	dependenciesToAdd: string[];
	handleCancel?: (value: unknown) => boolean;
	autoInstall?: boolean;
}

export async function installDependencies({
	context,
	dependenciesToAdd,
	handleCancel,
	autoInstall = false,
}: InstallDependenciesOptions) {
	const { telemetry, logger } = context;
	const s = p.spinner();

	if (dependenciesToAdd.length === 0) {
		return { installDepsConfirmed: false, ranInstall: false };
	}

	const depsString = dependenciesToAdd.map((d) => color.cyan(d)).join(', ');

	if (!autoInstall) {
		const addDepsSelection = await p.confirm({
			message: `Add required dependencies using ${color.cyan(context.packageManager.name)}? (${depsString})`,
			initialValue: true,
		});

		if (handleCancel?.(addDepsSelection)) {
			return { installDepsConfirmed: false, ranInstall: false };
		}

		if (!addDepsSelection) {
			return { installDepsConfirmed: false, ranInstall: false };
		}
	}

	s.start(
		`Running ${color.cyan(context.packageManager.name)} to add and install dependencies... (this might take a moment)`
	);
	try {
		await addAndInstallDependenciesViaPM(
			context.projectRoot,
			dependenciesToAdd,
			context.packageManager.name
		);
		s.stop(
			`✅ Dependencies installed: ${dependenciesToAdd.map((d) => color.cyan(d)).join(', ')}`
		);
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_INSTALLED, {
			success: true,
			dependencies: dependenciesToAdd.join(','),
			packageManager: context.packageManager.name,
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
			packageManager: context.packageManager.name,
		});
		const pmCommand = getManualInstallCommand(
			dependenciesToAdd,
			context.packageManager.name
		);
		logger.info(
			`Please try running '${pmCommand}' manually in ${color.cyan(path.relative(context.cwd, context.projectRoot))}.`
		);
		return { installDepsConfirmed: true, ranInstall: false };
	}
}
