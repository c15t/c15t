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
	'bun.lock': 'bun',
	'bun.lockb': 'bun',
	'package-lock.json': 'npm',
	'pnpm-lock.yaml': 'pnpm',
	'yarn.lock': 'yarn',
};

/**
 * Package manager configurations
 */
const PACKAGE_MANAGER_CONFIG: Record<
	PackageManager,
	Omit<PackageManagerResult, 'name'>
> = {
	bun: {
		addCommand: 'bun add',
		execCommand: 'bunx',
		installCommand: 'bun install',
		runCommand: 'bun run',
	},
	npm: {
		addCommand: 'npm install',
		execCommand: 'npx',
		installCommand: 'npm install',
		runCommand: 'npm run',
	},
	pnpm: {
		addCommand: 'pnpm add',
		execCommand: 'pnpm dlx',
		installCommand: 'pnpm install',
		runCommand: 'pnpm',
	},
	yarn: {
		addCommand: 'yarn add',
		execCommand: 'yarn dlx',
		installCommand: 'yarn',
		runCommand: 'yarn',
	},
};

/**
 * Detect the package manager from lock files
 */
const detectFromLockFile = async function detectFromLockFile(
	projectRoot: string,
	logger?: CliLogger
): Promise<PackageManager | null> {
	for (const [lockFile, pm] of Object.entries(LOCK_FILE_MAP)) {
		const lockPath = path.join(projectRoot, lockFile);
		try {
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			await fs.access(lockPath);
			logger?.debug(`Found ${lockFile}, using ${pm}`);
			return pm;
		} catch {
			// Lock file doesn't exist, continue
		}
	}
	return null;
};

/**
 * Detect the package manager from package.json packageManager field
 */
const detectFromPackageJson = async function detectFromPackageJson(
	projectRoot: string,
	logger?: CliLogger
): Promise<PackageManager | null> {
	try {
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const content = await fs.readFile(packageJsonPath, 'utf-8');
		const packageJson = JSON.parse(content);

		if (packageJson.packageManager) {
			const match = packageJson.packageManager.match(
				/^(?<capture1>npm|yarn|pnpm|bun)@/u
			);
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
};

/**
 * Prompt user to select a package manager
 */
const promptForPackageManager = async function promptForPackageManager(
	logger?: CliLogger
): Promise<PackageManager> {
	logger?.debug('Prompting user to select package manager');

	const result = await p.select({
		message: 'Which package manager do you use?',
		options: [
			{ hint: 'Fast all-in-one toolkit', label: 'bun', value: 'bun' },
			{ hint: 'Fast, disk space efficient', label: 'pnpm', value: 'pnpm' },
			{ hint: 'Classic package manager', label: 'yarn', value: 'yarn' },
			{ hint: 'Default Node.js package manager', label: 'npm', value: 'npm' },
		],
	});

	if (p.isCancel(result)) {
		throw new Error('Package manager selection cancelled');
	}

	return result as PackageManager;
};

/**
 * Detect the package manager being used in a project
 */
export const detectPackageManager = async function detectPackageManager(
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
		if (options?.interactive === false) {
			pm = 'npm';
			logger?.debug('Defaulting to npm');
		} else {
			pm = await promptForPackageManager(logger);
		}
	}

	const config = PACKAGE_MANAGER_CONFIG[pm];
	logger?.debug(`Using package manager: ${pm}`);

	return {
		name: pm,
		...config,
	};
};

/**
 * Get the install command for dependencies
 */
export const getInstallCommand = function getInstallCommand(
	pm: PackageManagerResult,
	packages: string[],
	options?: { dev?: boolean }
): string {
	const pkgList = packages.join(' ');
	// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
	const devFlag = options?.dev ? (pm.name === 'npm' ? '--save-dev' : '-D') : '';

	return `${pm.addCommand} ${devFlag} ${pkgList}`.trim().replace(/\s+/gu, ' ');
};

/**
 * Get the run command for a script
 */
export const getRunCommand = function getRunCommand(
	pm: PackageManagerResult,
	script: string
): string {
	return `${pm.runCommand} ${script}`;
};

/**
 * Get the exec command for a binary
 */
export const getExecCommand = function getExecCommand(
	pm: PackageManagerResult,
	binary: string,
	args?: string[]
): string {
	const argString = args?.join(' ') || '';
	return `${pm.execCommand} ${binary} ${argString}`.trim();
};

/**
 * Check if a package is installed
 */
export const isPackageInstalled = async function isPackageInstalled(
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
};
