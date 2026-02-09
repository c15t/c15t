/**
 * Package manager detection module
 *
 * Detects the package manager being used in a project
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import type { CliLogger, PackageManager, PackageManagerResult } from '../types';

/**
 * Lock file to package manager mapping
 */
const LOCK_FILE_MAP: Record<string, PackageManager> = {
	'bun.lockb': 'bun',
	'bun.lock': 'bun',
	'pnpm-lock.yaml': 'pnpm',
	'yarn.lock': 'yarn',
	'package-lock.json': 'npm',
};

/**
 * Package manager configurations
 */
const PACKAGE_MANAGER_CONFIG: Record<
	PackageManager,
	Omit<PackageManagerResult, 'name'>
> = {
	bun: {
		installCommand: 'bun install',
		addCommand: 'bun add',
		runCommand: 'bun run',
		execCommand: 'bunx',
	},
	pnpm: {
		installCommand: 'pnpm install',
		addCommand: 'pnpm add',
		runCommand: 'pnpm',
		execCommand: 'pnpm dlx',
	},
	yarn: {
		installCommand: 'yarn',
		addCommand: 'yarn add',
		runCommand: 'yarn',
		execCommand: 'yarn dlx',
	},
	npm: {
		installCommand: 'npm install',
		addCommand: 'npm install',
		runCommand: 'npm run',
		execCommand: 'npx',
	},
};

/**
 * Detect the package manager from lock files
 */
async function detectFromLockFile(
	projectRoot: string,
	logger?: CliLogger
): Promise<PackageManager | null> {
	for (const [lockFile, pm] of Object.entries(LOCK_FILE_MAP)) {
		const lockPath = path.join(projectRoot, lockFile);
		try {
			await fs.access(lockPath);
			logger?.debug(`Found ${lockFile}, using ${pm}`);
			return pm;
		} catch {
			// Lock file doesn't exist, continue
		}
	}
	return null;
}

/**
 * Detect the package manager from package.json packageManager field
 */
async function detectFromPackageJson(
	projectRoot: string,
	logger?: CliLogger
): Promise<PackageManager | null> {
	try {
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const content = await fs.readFile(packageJsonPath, 'utf-8');
		const packageJson = JSON.parse(content);

		if (packageJson.packageManager) {
			const match = packageJson.packageManager.match(/^(npm|yarn|pnpm|bun)@/);
			if (match) {
				const pm = match[1] as PackageManager;
				logger?.debug(`Found packageManager field: ${pm}`);
				return pm;
			}
		}
	} catch {
		// Ignore errors
	}
	return null;
}

/**
 * Prompt user to select a package manager
 */
async function promptForPackageManager(
	logger?: CliLogger
): Promise<PackageManager> {
	logger?.debug('Prompting user to select package manager');

	const result = await p.select({
		message: 'Which package manager do you use?',
		options: [
			{ value: 'bun', label: 'bun', hint: 'Fast all-in-one toolkit' },
			{ value: 'pnpm', label: 'pnpm', hint: 'Fast, disk space efficient' },
			{ value: 'yarn', label: 'yarn', hint: 'Classic package manager' },
			{ value: 'npm', label: 'npm', hint: 'Default Node.js package manager' },
		],
	});

	if (p.isCancel(result)) {
		throw new Error('Package manager selection cancelled');
	}

	return result as PackageManager;
}

/**
 * Detect the package manager being used in a project
 */
export async function detectPackageManager(
	projectRoot: string,
	logger?: CliLogger,
	options?: { interactive?: boolean }
): Promise<PackageManagerResult> {
	logger?.debug(`Detecting package manager in ${projectRoot}`);

	// Try to detect from lock file
	let pm = await detectFromLockFile(projectRoot, logger);

	// Try to detect from package.json
	if (!pm) {
		pm = await detectFromPackageJson(projectRoot, logger);
	}

	// Fall back to interactive selection or default
	if (!pm) {
		if (options?.interactive !== false) {
			pm = await promptForPackageManager(logger);
		} else {
			pm = 'npm';
			logger?.debug('Defaulting to npm');
		}
	}

	const config = PACKAGE_MANAGER_CONFIG[pm];
	logger?.debug(`Using package manager: ${pm}`);

	return {
		name: pm,
		...config,
	};
}

/**
 * Get the install command for dependencies
 */
export function getInstallCommand(
	pm: PackageManagerResult,
	packages: string[],
	options?: { dev?: boolean }
): string {
	const pkgList = packages.join(' ');
	const devFlag = options?.dev ? (pm.name === 'npm' ? '--save-dev' : '-D') : '';

	return `${pm.addCommand} ${devFlag} ${pkgList}`.trim().replace(/\s+/g, ' ');
}

/**
 * Get the run command for a script
 */
export function getRunCommand(
	pm: PackageManagerResult,
	script: string
): string {
	return `${pm.runCommand} ${script}`;
}

/**
 * Get the exec command for a binary
 */
export function getExecCommand(
	pm: PackageManagerResult,
	binary: string,
	args?: string[]
): string {
	const argString = args?.join(' ') || '';
	return `${pm.execCommand} ${binary} ${argString}`.trim();
}

/**
 * Check if a package is installed
 */
export async function isPackageInstalled(
	projectRoot: string,
	packageName: string
): Promise<boolean> {
	try {
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const content = await fs.readFile(packageJsonPath, 'utf-8');
		const packageJson = JSON.parse(content);

		const deps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		return packageName in deps;
	} catch {
		return false;
	}
}
