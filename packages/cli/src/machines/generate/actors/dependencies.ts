/**
 * Dependencies actor for the generate state machine
 *
 * Handles package installation via detected package manager.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';

import { fromPromise } from 'xstate';

import { SCOPED_FRAMEWORK_PACKAGES, UMBRELLA_PACKAGE } from '~/constants';
import type { PackageManager } from '~/context/package-manager-detection';
import type { CliContext } from '~/context/types';

/**
 * Input for the dependency installation actor
 */
export interface DependencyInstallInput {
	cliContext: CliContext;
	dependencies: string[];
}

/**
 * Output from the dependency installation actor
 */
export interface DependencyInstallOutput {
	success: boolean;
	installedDependencies: string[];
	error?: string;
}

/**
 * Execute package manager command to install dependencies
 */
async function runPackageManagerInstall(
	projectRoot: string,
	dependencies: string[],
	packageManager: PackageManager
): Promise<void> {
	if (dependencies.length === 0) {
		return;
	}

	let command: string;
	let args: string[];

	switch (packageManager) {
		case 'npm':
			command = 'npm';
			args = ['install', ...dependencies];
			break;
		case 'yarn':
			command = 'yarn';
			args = ['add', ...dependencies];
			break;
		case 'pnpm':
			command = 'pnpm';
			args = ['add', ...dependencies];
			break;
		case 'bun':
			command = 'bun';
			args = ['add', ...dependencies];
			break;
		default:
			throw new Error(`Unsupported package manager: ${packageManager}`);
	}

	const child = spawn(command, args, {
		cwd: projectRoot,
		stdio: 'inherit',
	});

	const [exitCode] = await once(child, 'exit');

	if (exitCode !== 0) {
		throw new Error(`Package manager exited with code ${exitCode}`);
	}
}

/**
 * Dependency installation actor
 */
export const dependencyInstallActor = fromPromise<
	DependencyInstallOutput,
	DependencyInstallInput
>(async ({ input }) => {
	const { cliContext, dependencies } = input;
	const { projectRoot, packageManager, logger } = cliContext;

	if (dependencies.length === 0) {
		return {
			success: true,
			installedDependencies: [],
		};
	}

	logger.debug(`Installing dependencies: ${dependencies.join(', ')}`);
	logger.debug(`Using package manager: ${packageManager.name}`);

	try {
		await runPackageManagerInstall(
			projectRoot,
			dependencies,
			packageManager.name
		);

		return {
			success: true,
			installedDependencies: dependencies,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		logger.error(`Dependency installation failed: ${errorMessage}`);

		return {
			success: false,
			installedDependencies: [],
			error: errorMessage,
		};
	}
});

/**
 * Get manual install command for display to user
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
		case 'bun':
			return `bun add ${dependencies.join(' ')}`;
		default:
			return `npm install ${dependencies.join(' ')}`;
	}
}

/**
 * Check if dependencies are already installed
 */
export interface CheckDepsInput {
	projectRoot: string;
	dependencies: string[];
}

export interface CheckDepsOutput {
	installed: string[];
	missing: string[];
}

/**
 * Check whether a requested dependency is satisfied by the app's manifest.
 *
 * The umbrella `c15t` requirement is also satisfied when the app already
 * depends on a scoped framework package (`@c15t/react`, `@c15t/nextjs`) —
 * rerunning setup in such an app must retain the scoped install style
 * instead of layering the umbrella package on top of it.
 *
 * @param depName - Bare package name (version specifier stripped)
 * @param allDeps - Merged dependencies and devDependencies from package.json
 * @returns Whether the dependency does not need to be installed
 */
function isDependencySatisfied(
	depName: string,
	allDeps: Record<string, unknown>
): boolean {
	if (depName in allDeps) {
		return true;
	}

	return (
		depName === UMBRELLA_PACKAGE &&
		SCOPED_FRAMEWORK_PACKAGES.some((scopedPackage) => scopedPackage in allDeps)
	);
}

/**
 * Split requested dependencies into installed and missing sets based on the
 * project's package.json.
 *
 * @param input - Project root and the dependencies to check
 * @returns Installed and missing dependency lists
 */
export async function checkInstalledDependencies(
	input: CheckDepsInput
): Promise<CheckDepsOutput> {
	const { projectRoot, dependencies } = input;
	const fs = await import('node:fs/promises');
	const path = await import('node:path');

	const installed: string[] = [];
	const missing: string[] = [];

	try {
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

		const allDeps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		for (const dep of dependencies) {
			// Handle scoped packages
			const depName = dep.startsWith('@') ? dep : dep.split('@')[0];

			if (depName && isDependencySatisfied(depName, allDeps)) {
				installed.push(dep);
			} else {
				missing.push(dep);
			}
		}
	} catch {
		// If we can't read package.json, assume all are missing
		missing.push(...dependencies);
	}

	return { installed, missing };
}

export const checkDependenciesActor = fromPromise<
	CheckDepsOutput,
	CheckDepsInput
>(({ input }) => checkInstalledDependencies(input));
