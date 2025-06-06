import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import type { CliLogger } from '~/utils/logger';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface PackageManagerResult {
	name: PackageManager;
	version: string | null;
}

/**
 * Helper function to check if a directory is a valid project root
 *
 * @param dir - Directory to check
 * @returns Promise<boolean> indicating if directory is a valid project root
 */
async function isValidProjectRoot(dir: string): Promise<boolean> {
	try {
		await fs.access(path.join(dir, 'package.json'));

		// Check for node_modules or a lock file to confirm it's an actual project
		const files = await fs.readdir(dir);
		return files.some(
			(file) =>
				file === 'node_modules' ||
				file === 'package-lock.json' ||
				file === 'yarn.lock' ||
				file === 'pnpm-lock.yaml'
		);
	} catch {
		return false;
	}
}

/**
 * Detects package manager in a specific directory
 */
async function detectPackageManagerInDirectory(
	dir: string,
	files: string[],
	logger?: CliLogger
): Promise<PackageManagerResult | null> {
	if (files.includes('pnpm-workspace.yaml')) {
		logger?.debug('Found pnpm workspace configuration');
		return {
			name: 'pnpm',
			version: await getPackageManagerVersion('pnpm'),
		};
	}

	if (files.includes('yarn.lock') && (await isValidProjectRoot(dir))) {
		logger?.debug('Found yarn.lock at root level');
		return {
			name: 'yarn',
			version: await getPackageManagerVersion('yarn'),
		};
	}

	if (files.includes('package-lock.json') && (await isValidProjectRoot(dir))) {
		logger?.debug('Found package-lock.json at root level');
		return {
			name: 'npm',
			version: await getPackageManagerVersion('npm'),
		};
	}

	return null;
}

/**
 * Helper function to check if any parent directory has package manager files
 *
 * @param startDir - Starting directory to check from
 * @param logger - Optional logger instance for debug messages
 * @returns The package manager if found at root level, null otherwise
 */
async function findPackageManager(
	startDir: string,
	logger?: CliLogger
): Promise<PackageManagerResult | null> {
	logger?.debug(`Checking for package manager starting from ${startDir}`);

	if (!(await isValidProjectRoot(startDir))) {
		logger?.debug(
			`${startDir} is not a valid project root, skipping detection`
		);
		return null;
	}

	let currentDir = startDir;
	let depth = 0;
	const maxDepth = 4;

	while (depth < maxDepth) {
		try {
			logger?.debug(
				`Checking directory ${currentDir} for package manager files`
			);
			const files = await fs.readdir(currentDir);

			const packageManager = await detectPackageManagerInDirectory(
				currentDir,
				files,
				logger
			);
			if (packageManager) {
				return packageManager;
			}

			const parentDir = path.dirname(currentDir);
			if (parentDir === currentDir) {
				break;
			}

			currentDir = parentDir;
			depth++;
		} catch (error) {
			logger?.debug(
				`Error checking directory ${currentDir}: ${error instanceof Error ? error.message : String(error)}`
			);
			break;
		}
	}

	logger?.debug('No package manager found');
	return null;
}

/**
 * Gets the version of a package manager
 *
 * @param pm - Package manager name
 * @returns The version of the package manager or null if not found
 */
async function getPackageManagerVersion(
	pm: PackageManager
): Promise<string | null> {
	try {
		const { execSync } = await import('node:child_process');
		const version = execSync(`${pm} --version`).toString().trim();
		return version;
	} catch {
		return null;
	}
}

/**
 * Detects the package manager used in the project
 *
 * @param projectRoot - The root directory of the project
 * @param logger - Optional logger instance for debug messages
 * @returns The detected package manager
 */
export async function detectPackageManager(
	projectRoot: string,
	logger?: CliLogger
): Promise<PackageManagerResult> {
	try {
		logger?.debug(`Detecting package manager in ${projectRoot}`);

		// First check for monorepo package manager
		const packageManager = await findPackageManager(projectRoot, logger);

		if (packageManager) {
			logger?.debug(`Detected package manager: ${packageManager.name}`);
			return packageManager;
		}
	} catch (error) {
		logger?.error(
			`Error detecting package manager: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	// If no package manager found, prompt user for package manager
	const selectedPackageManager = await p.select<PackageManager>({
		message: 'Please select your package manager:',
		options: [
			{ value: 'npm', label: 'npm' },
			{ value: 'yarn', label: 'yarn' },
			{ value: 'pnpm', label: 'pnpm' },
		],
		initialValue: 'npm',
	});

	if (p.isCancel(selectedPackageManager)) {
		// Handle potential cancellation (though select usually throws)
		logger?.debug('Package manager selection cancelled by user');
		logger?.failed('Package manager selection cancelled. Exiting.');
		process.exit(0);
	}

	const version = await getPackageManagerVersion(selectedPackageManager);
	logger?.debug(
		`User selected package manager: ${selectedPackageManager} (version: ${version ?? 'unknown'})`
	);

	return { name: selectedPackageManager, version };
}
