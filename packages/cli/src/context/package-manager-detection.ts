import * as p from '@clack/prompts';
import { detect } from 'package-manager-detector/detect';

import type { CliLogger } from '~/utils/logger';

import { CliError } from '../core/errors';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';
export const SUPPORTED_PACKAGE_MANAGERS: PackageManager[] = [
	'npm',
	'yarn',
	'pnpm',
	'bun',
];
export interface PackageManagerResult {
	name: PackageManager;
	version: string | null;
}

/**
 * Gets the version of a package manager
 *
 * @param pm - Package manager name
 * @returns The version of the package manager or null if not found
 */
const getPackageManagerVersion = async function getPackageManagerVersion(
	pm: PackageManager
): Promise<string | null> {
	try {
		const { execSync } = await import('node:child_process');
		const version = execSync(`${pm} --version`).toString().trim();
		return version;
	} catch {
		return null;
	}
};

/**
 * Detects the package manager used in the project
 *
 * @param projectRoot - The root directory of the project
 * @param logger - Optional logger instance for debug messages
 * @returns The detected package manager
 */
export const detectPackageManager = async function detectPackageManager(
	projectRoot: string,
	logger?: CliLogger,
	interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
): Promise<PackageManagerResult> {
	try {
		logger?.debug('Detecting package manager');

		// First check for monorepo package manager
		const pm = await detect({
			cwd: projectRoot,
		});

		if (!pm) {
			throw new Error('No package manager detected');
		}

		logger?.debug(`Detected package manager: ${pm.name}`);

		if (!SUPPORTED_PACKAGE_MANAGERS.includes(pm.name as PackageManager)) {
			throw new Error(`Unsupported package manager: ${pm.name}`);
		}

		return {
			name: pm.name as PackageManager,
			version: pm.version ?? null,
		};
	} catch (error) {
		logger?.debug(
			`Error detecting package manager: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	if (!interactive) {
		return { name: 'npm', version: null };
	}

	// If no package manager found, prompt user for package manager
	const selectedPackageManager = await p.select<PackageManager>({
		initialValue: 'npm',
		message: 'Please select your package manager:',
		options: [
			{ label: 'npm', value: 'npm' },
			{ label: 'yarn', value: 'yarn' },
			{ label: 'pnpm', value: 'pnpm' },
			{ label: 'bun', value: 'bun' },
		],
	});

	if (p.isCancel(selectedPackageManager)) {
		// Handle potential cancellation (though select usually throws)
		logger?.debug('Package manager selection cancelled by user');
		throw new CliError('CANCELLED');
	}

	const version = await getPackageManagerVersion(selectedPackageManager);
	logger?.debug(
		`User selected package manager: ${selectedPackageManager} (version: ${version ?? 'unknown'})`
	);

	return { name: selectedPackageManager, version };
};
