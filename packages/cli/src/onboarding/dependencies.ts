import { spawn } from 'node:child_process';
import { once } from 'node:events';

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
	// Map dependencies to the 'pkg@workspace:*' format
	const depsToAdd = dependencies.map((dep) => `${dep}@workspace:*`);

	if (depsToAdd.length === 0) {
		// Nothing to add
		return;
	}

	let command = '';
	let args: string[] = [];
	
	switch (packageManager) {
		case 'npm':
			// npm install pkg@workspace:* adds to dependencies by default
			command = 'npm';
			args = ['install', ...depsToAdd];
			break;
		case 'yarn':
			// yarn add pkg@workspace:* adds to dependencies
			command = 'yarn';
			args = ['add', ...depsToAdd];
			break;
		case 'pnpm':
			// pnpm add pkg@workspace:* adds to dependencies and handles workspace protocol
			command = 'pnpm';
			args = ['add', ...depsToAdd];
			break;
		default:
			throw new Error(
				`Unsupported package manager for dependency addition: ${packageManager}`
			);
	}

	// Execute the command with spawn to prevent shell injection
	const child = spawn(command, args, { 
		cwd: projectRoot,
		stdio: 'inherit' 
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
	const depsToAdd = dependencies.map((dep) => `${dep}@workspace:*`);

	switch (packageManager) {
		case 'npm':
			return `npm install ${depsToAdd.join(' ')}`;
		case 'yarn':
			return `yarn add ${depsToAdd.join(' ')}`;
		case 'pnpm':
			return `pnpm add ${depsToAdd.join(' ')}`;
		default:
			return `npm install ${depsToAdd.join(' ')}`;
	}
}
