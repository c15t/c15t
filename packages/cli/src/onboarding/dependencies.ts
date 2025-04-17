import { exec } from 'node:child_process';
import { promisify } from 'node:util';

// Define PackageManager type here since the import isn't working
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

const execAsync = promisify(exec);

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
	// Map dependencies to the 'pkg@workspace:*' format
	const depsToAddArg = dependencies
		.map((dep) => `${dep}@workspace:*`)
		.join(' ');

	if (depsToAddArg.length === 0) {
		// Nothing to add
		return;
	}

	let command = '';
	switch (packageManager) {
		case 'npm':
			// npm install pkg@workspace:* adds to dependencies by default
			command = `npm install ${depsToAddArg}`;
			break;
		case 'yarn':
			// yarn add pkg@workspace:* adds to dependencies
			command = `yarn add ${depsToAddArg}`;
			break;
		case 'pnpm':
			// pnpm add pkg@workspace:* adds to dependencies and handles workspace protocol
			command = `pnpm add ${depsToAddArg}`;
			break;
	}

	if (!command) {
		throw new Error(
			`Unsupported package manager for dependency addition: ${packageManager}`
		);
	}

	// Execute the command
	await execAsync(command, { cwd: projectRoot });
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
	const depsToAddArg = dependencies
		.map((dep) => `${dep}@workspace:*`)
		.join(' ');

	switch (packageManager) {
		case 'npm':
			return `npm install ${depsToAddArg}`;
		case 'yarn':
			return `yarn add ${depsToAddArg}`;
		case 'pnpm':
			return `pnpm add ${depsToAddArg}`;
		default:
			return `npm install ${depsToAddArg}`;
	}
}
