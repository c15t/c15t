import { spawn } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

import { getInstallSpecifier } from '../../generate/dependencies.ts';

/** Package managers supported by native frontend generation. */
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/** Reject unsupported native installer launches before applying application files. @internal */
export const requireNativeInstaller = (): void => {
	if (process.platform === 'win32') {
		throw new Error(
			'Native frontend dependency installation is unavailable on Windows. Use --skip-install and install dependencies manually.'
		);
	}
};

const cancelled = (): Error =>
	new Error('Dependency installation was cancelled. Generated files remain.');

/**
 * Install dependencies after successfully applying generation files.
 * @param projectRoot Application directory in which to install dependencies.
 * @param dependencies Registry specifiers, with bare c15t names mapped to alpha.
 * @param manager Package manager chosen by the host.
 * @param signal Optional caller cancellation.
 * @returns Completion after the package manager closes successfully.
 * @throws {Error} For invalid specifiers, installer failure, or cancellation. Generated files remain.
 */
export const installGenerationDependencies = async (
	projectRoot: string,
	dependencies: string[],
	manager: PackageManager,
	signal?: AbortSignal
): Promise<void> => {
	if (signal?.aborted) {
		throw cancelled();
	}
	if (!['npm', 'pnpm', 'yarn', 'bun'].includes(manager)) {
		throw new Error(
			'Choose npm, pnpm, yarn, or bun for dependency installation.'
		);
	}
	if (!dependencies.length) {
		return;
	}
	requireNativeInstaller();
	const root = realpathSync(projectRoot);
	const manifest = join(root, 'package.json');
	const entry = lstatSync(manifest);
	if (!entry.isFile() || entry.isSymbolicLink()) {
		throw new Error('Dependency installation requires a regular package.json.');
	}
	readFileSync(manifest, 'utf8');
	const specifiers = dependencies.map(getInstallSpecifier);
	if (
		specifiers.some(
			(specifier) =>
				!specifier || specifier.startsWith('-') || /\s/u.test(specifier)
		)
	) {
		throw new Error('Invalid dependency installation argument.');
	}
	const child = spawn(
		manager,
		[manager === 'npm' ? 'install' : 'add', ...specifiers],
		{
			cwd: root,
			stdio: ['ignore', 2, 2],
		}
	);
	const abort = () => {
		child.kill('SIGTERM');
	};
	signal?.addEventListener('abort', abort, { once: true });
	if (signal?.aborted) {
		abort();
	}
	try {
		await new Promise<void>((resolve, reject) => {
			let failure: Error | undefined;
			child.once('error', (error) => {
				failure = error;
			});
			child.once('close', (code) => {
				if (signal?.aborted) {
					reject(cancelled());
				} else if (failure || code !== 0) {
					reject(
						new Error(
							`Dependency installation failed. Generated files remain; retry ${manager} ${manager === 'npm' ? 'install' : 'add'} ${specifiers.join(' ')}.`
						)
					);
				} else {
					resolve();
				}
			});
		});
	} finally {
		signal?.removeEventListener('abort', abort);
	}
};
