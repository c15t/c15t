import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { detect } from 'package-manager-detector/detect';
import type { CliLogger } from '~/utils/logger';

/**
 * Supported package managers
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Package manager detection result
 */
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
		// Check for package.json
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
 * Helper function to check if any parent directory has monorepo package manager files
 *
 * @param startDir - Starting directory to check from
 * @param logger - Optional logger instance for debug messages
 * @returns The package manager if found at root level, null otherwise
 */
async function findMonorepoPackageManager(
	startDir: string,
	logger?: CliLogger
): Promise<PackageManagerResult | null> {
	logger?.debug(
		`Checking for monorepo package manager starting from ${startDir}`
	);

	// First verify the start directory is a valid project
	if (!(await isValidProjectRoot(startDir))) {
		logger?.debug(
			`${startDir} is not a valid project root, skipping monorepo detection`
		);
		return null;
	}

	// Check current directory and up to 3 parent directories
	let currentDir = startDir;
	let depth = 0;
	const maxDepth = 3;

	while (depth < maxDepth) {
		try {
			logger?.debug(
				`Checking directory ${currentDir} for package manager files`
			);
			const files = await fs.readdir(currentDir);

			// Check for monorepo indicators
			if (files.includes('pnpm-workspace.yaml')) {
				logger?.debug('Found pnpm workspace configuration');
				return {
					name: 'pnpm',
					version: await getPackageManagerVersion('pnpm'),
				};
			}
			if (files.includes('yarn.lock')) {
				// For yarn, we need to verify this is a valid project root
				if (await isValidProjectRoot(currentDir)) {
					logger?.debug('Found yarn.lock at root level');
					return {
						name: 'yarn',
						version: await getPackageManagerVersion('yarn'),
					};
				}
				logger?.debug(
					'Found yarn.lock but directory is not a valid project root'
				);
			}
			if (files.includes('package-lock.json')) {
				// For npm, we need to verify this is a valid project root
				if (await isValidProjectRoot(currentDir)) {
					logger?.debug('Found package-lock.json at root level');
					return {
						name: 'npm',
						version: await getPackageManagerVersion('npm'),
					};
				}
				logger?.debug(
					'Found package-lock.json but directory is not a valid project root'
				);
			}

			// Move up one directory
			const parentDir = path.dirname(currentDir);
			if (parentDir === currentDir) {
				// We've reached the root of the filesystem
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

	logger?.debug('No monorepo package manager found');
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
		const monorepoPm = await findMonorepoPackageManager(projectRoot, logger);
		if (monorepoPm) {
			logger?.debug(`Detected monorepo package manager: ${monorepoPm.name}`);
			return monorepoPm;
		}

		// Use package-manager-detector's native functionality for non-monorepo detection
		const result = await detect({ cwd: projectRoot });
		logger?.debug(`Package manager detector result: ${JSON.stringify(result)}`);

		let detectedPm: string | null = null;

		// Check if detection returned a simple string
		if (typeof result === 'string') {
			detectedPm = result;
		}
		// Check if detection returned an object with a 'name' or 'pm' property
		else if (result && typeof result === 'object') {
			if ('name' in result && typeof result.name === 'string') {
				detectedPm = result.name;
			} else if ('pm' in result && typeof result.pm === 'string') {
				detectedPm = result.pm;
			}
		}

		// Check if the detected PM is one we support
		if (
			detectedPm &&
			(detectedPm === 'npm' || detectedPm === 'yarn' || detectedPm === 'pnpm')
		) {
			const version = await getPackageManagerVersion(
				detectedPm as PackageManager
			);
			logger?.debug(
				`Detected supported package manager: ${detectedPm} (version: ${version ?? 'unknown'})`
			);
			return { name: detectedPm as PackageManager, version };
		}

		// If detection failed or returned something unexpected, throw to prompt the user
		let detectedValueStr = String(result);
		if (result && typeof result === 'object') {
			detectedValueStr = JSON.stringify(result);
		}
		logger?.debug(`Unsupported package manager detected: ${detectedValueStr}`);
		logger?.failed(
			`Could not reliably detect package manager (detected: ${detectedValueStr}).`
		);
		return { name: 'npm', version: null };
	} catch (error) {
		// If detection fails or throws, prompt the user
		logger?.debug(
			`Package manager detection failed: ${error instanceof Error ? error.message : String(error)}`
		);
		logger?.warn(
			`Automatic package manager detection failed: ${error instanceof Error ? error.message : String(error)}`
		);
		const selectedPackageManager = await p.select<PackageManager>({
			message: 'Please select your package manager:',
			options: [
				{ value: 'npm', label: 'npm' },
				{ value: 'yarn', label: 'yarn' },
				{ value: 'pnpm', label: 'pnpm' },
			],
			initialValue: 'npm',
		});

		// Handle potential cancellation (though select usually throws)
		if (p.isCancel(selectedPackageManager)) {
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
}
