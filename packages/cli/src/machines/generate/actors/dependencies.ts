/**
 * Dependencies actor for the generate state machine
 *
 * Handles package installation via detected package manager.
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

import { fromPromise } from 'xstate';

import { SCOPED_FRAMEWORK_PACKAGES, UMBRELLA_PACKAGE } from '~/constants';
import type { PackageManager } from '~/context/package-manager-detection';
import type { CliContext } from '~/context/types';
import {
	dependencyName,
	isC15tPackage,
	isOnC15tRelease,
	withC15tRelease,
} from '~/utils/c15t-release';

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

const pendingInstalls = new WeakMap<CliContext, Promise<void>>();

const signalProcessGroup = (child: ChildProcess, signal: NodeJS.Signals) => {
	if (!child.pid) {
		return;
	}
	try {
		process.kill(-child.pid, signal);
	} catch (error) {
		if (
			!(error instanceof Error && 'code' in error && error.code === 'ESRCH')
		) {
			throw error;
		}
	}
};

/** Wait for process close, including cancellation of package lifecycle children. */
const waitForInstaller = async (child: ChildProcess, signal?: AbortSignal) => {
	let failure: Error | undefined;
	let escalation: ReturnType<typeof setTimeout> | undefined;
	let termination: Promise<void> | undefined;
	const abort = () => {
		if (process.platform === 'win32') {
			if (child.pid) {
				termination = new Promise<void>((resolve) => {
					const killer = spawn(
						'taskkill',
						['/pid', String(child.pid), '/T', '/F'],
						{
							stdio: 'ignore',
						}
					);
					killer.on('error', (error) => {
						failure = error;
						child.kill();
					});
					killer.on('close', () => resolve());
				});
			}
			return;
		}
		signalProcessGroup(child, 'SIGTERM');
		escalation = setTimeout(() => signalProcessGroup(child, 'SIGKILL'), 2000);
	};
	const closed = new Promise<number | null>((resolve) => {
		child.on('error', (error) => {
			failure = error;
		});
		child.once('close', resolve);
	});
	signal?.addEventListener('abort', abort, { once: true });
	if (signal?.aborted) {
		abort();
	}
	try {
		const exitCode = await closed;
		await termination;
		if (
			signal &&
			process.platform !== 'win32' &&
			(signal.aborted || failure || exitCode !== 0)
		) {
			// A package manager may exit before its lifecycle scripts. Stop the
			// isolated group on cancellation or failure before rollback can start.
			signalProcessGroup(child, 'SIGKILL');
		}
		signal?.throwIfAborted();
		if (failure) {
			throw failure;
		}
		if (exitCode !== 0) {
			throw new Error(`Package manager exited with code ${exitCode}`);
		}
	} finally {
		clearTimeout(escalation);
		signal?.removeEventListener('abort', abort);
	}
};

/** XState stops promise actors without awaiting them; cancellation must join teardown. */
export const settleDependencyInstallActor = fromPromise<undefined, CliContext>(
	async ({ input }) => {
		try {
			await pendingInstalls.get(input);
		} catch {
			// The install actor reports failures. Cancellation only waits for close.
		}
		return undefined;
	}
);

/**
 * Execute package manager command to install dependencies
 */
export const runPackageManagerInstall = async function runPackageManagerInstall(
	projectRoot: string,
	dependencies: string[],
	packageManager: PackageManager,
	signal?: AbortSignal
): Promise<void> {
	signal?.throwIfAborted();
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
		detached: signal !== undefined && process.platform !== 'win32',
		stdio: ['ignore', process.stderr, process.stderr],
	});
	await waitForInstaller(child, signal);
};

/**
 * Dependency installation actor
 */
export const dependencyInstallActor = fromPromise<
	DependencyInstallOutput,
	DependencyInstallInput
>(async ({ input, signal }) => {
	const { cliContext, dependencies } = input;
	const { projectRoot, packageManager, logger } = cliContext;

	if (dependencies.length === 0) {
		return {
			installedDependencies: [],
			success: true,
		};
	}

	logger.debug(`Installing dependencies: ${dependencies.join(', ')}`);
	logger.debug(`Using package manager: ${packageManager.name}`);

	const installation = runPackageManagerInstall(
		projectRoot,
		dependencies,
		packageManager.name,
		signal
	);
	pendingInstalls.set(cliContext, installation);
	try {
		await installation;

		return {
			installedDependencies: dependencies,
			success: true,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		logger.error(`Dependency installation failed: ${errorMessage}`);

		return {
			error: errorMessage,
			installedDependencies: [],
			success: false,
		};
	} finally {
		pendingInstalls.delete(cliContext);
	}
});

/**
 * Get manual install command for display to user
 */
export const getManualInstallCommand = function getManualInstallCommand(
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
};

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
 * Whether the app declares a package on a range setup can keep. A c15t
 * package must also be on the release line this CLI installs, so a v2
 * install is replaced rather than left under v3 code.
 */
const isDeclared = function isDeclared(
	name: string,
	allDeps: Record<string, unknown>
): boolean {
	if (!(name in allDeps)) {
		return false;
	}
	const range = allDeps[name];
	return (
		!isC15tPackage(name) ||
		typeof range !== 'string' ||
		isOnC15tRelease(name, range)
	);
};

/**
 * Resolve one requested dependency against the app's manifest.
 *
 * The umbrella `c15t` requirement is also satisfied when the app already
 * depends on a scoped framework package (`@c15t/react`, `@c15t/nextjs`) —
 * rerunning setup in such an app must retain the scoped install style
 * instead of layering the umbrella package on top of it. A scoped package
 * on another release line is reinstalled from this CLI's line instead.
 *
 * @param dep - Requested dependency, possibly with a version specifier
 * @param allDeps - Merged dependencies and devDependencies from package.json
 * @returns The packages still to install; empty when the request is met
 */
const missingFor = function missingFor(
	dep: string,
	allDeps: Record<string, unknown>
): string[] {
	const name = dependencyName(dep);
	if (isDeclared(name, allDeps)) {
		return [];
	}
	if (name === UMBRELLA_PACKAGE && !(name in allDeps)) {
		const scoped = SCOPED_FRAMEWORK_PACKAGES.filter(
			(scopedPackage) => scopedPackage in allDeps
		);
		if (scoped.length > 0) {
			return scoped
				.filter((scopedPackage) => !isDeclared(scopedPackage, allDeps))
				.map((scopedPackage) => withC15tRelease(scopedPackage));
		}
	}
	return [dep];
};

/**
 * Split requested dependencies into installed and missing sets based on the
 * project's package.json. A c15t package declared on another release line
 * counts as missing, so setup installs the line it generates code for.
 *
 * @param input - Project root and the dependencies to check
 * @returns Installed and missing dependency lists
 */
export const checkInstalledDependencies =
	async function checkInstalledDependencies(
		input: CheckDepsInput
	): Promise<CheckDepsOutput> {
		const { projectRoot, dependencies } = input;
		const fs = await import('node:fs/promises');
		const path = await import('node:path');

		const installed: string[] = [];
		const missing: string[] = [];

		try {
			const packageJsonPath = path.join(projectRoot, 'package.json');
			const packageJson = JSON.parse(
				await fs.readFile(packageJsonPath, 'utf-8')
			);

			const allDeps = {
				...packageJson.dependencies,
				...packageJson.devDependencies,
			};

			for (const dep of dependencies) {
				const toInstall = missingFor(dep, allDeps);
				if (toInstall.length === 0) {
					installed.push(dep);
				} else {
					missing.push(...toInstall);
				}
			}
		} catch {
			// If we can't read package.json, assume all are missing
			missing.push(...dependencies);
		}

		return { installed, missing };
	};

export const checkDependenciesActor = fromPromise<
	CheckDepsOutput,
	CheckDepsInput
>(({ input }) => checkInstalledDependencies(input));
