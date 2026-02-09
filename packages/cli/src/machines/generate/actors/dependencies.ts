/**
 * Dependencies actor for the generate state machine
 *
 * Handles package installation via detected package manager.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fromPromise } from 'xstate';
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

export const checkDependenciesActor = fromPromise<
	CheckDepsOutput,
	CheckDepsInput
>(async ({ input }) => {
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

			if (depName && depName in allDeps) {
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
});
