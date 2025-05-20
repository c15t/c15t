import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { detect } from 'package-manager-detector/detect';

/**
 * Supported package managers
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';
export type AvailiblePackages = '@c15t/nextjs' | '@c15t/react' | 'c15t';

/**
 * Framework detection result
 */
export interface FrameworkDetectionResult {
	framework: string | null;
	pkg: AvailiblePackages | null;
	hasReact: boolean;
}

/**
 * Detects the framework and React usage in the project
 *
 * @param projectRoot - The root directory of the project
 * @returns Object containing framework info and whether React is used
 */
export async function detectFramework(
	projectRoot: string
): Promise<FrameworkDetectionResult> {
	try {
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
		const deps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		const hasReact = 'react' in deps;
		let framework: string | null = null;
		let pkg: AvailiblePackages = hasReact ? '@c15t/react' : 'c15t';

		if ('next' in deps) {
			framework = 'Next.js';
			pkg = '@c15t/nextjs';
		} else if ('@remix-run/react' in deps) {
			framework = 'Remix';
		} else if (
			'@vitejs/plugin-react' in deps ||
			'@vitejs/plugin-react-swc' in deps
		) {
			framework = 'Vite + React';
		} else if ('gatsby' in deps) {
			framework = 'Gatsby';
		} else if (hasReact) {
			framework = 'React';
		}

		return { framework, pkg, hasReact };
	} catch {
		return { framework: null, pkg: null, hasReact: false };
	}
}

/**
 * Detects the project root by finding the package.json file
 *
 * @param cwd - Current working directory
 * @returns The project root directory path or cwd if not found
 */
export async function detectProjectRoot(cwd: string): Promise<string> {
	let projectRoot = cwd;
	try {
		let prevDir = '';
		while (projectRoot !== prevDir) {
			try {
				await fs.access(path.join(projectRoot, 'package.json'));
				break; // Found package.json
			} catch {
				prevDir = projectRoot;
				projectRoot = path.dirname(projectRoot);
			}
		}
		if (projectRoot === prevDir) {
			throw new Error('Could not find project root (no package.json found)');
		}
		return projectRoot;
	} catch {
		// Fallback to current directory if not found
		return cwd;
	}
}

/**
 * Helper function to check if any parent directory has monorepo package manager files
 *
 * @param startDir - Starting directory to check from
 * @returns The package manager if found at root level, null otherwise
 */
async function findMonorepoPackageManager(
	startDir: string
): Promise<PackageManager | null> {
	let currentDir = startDir;
	let prevDir = '';

	while (currentDir !== prevDir) {
		try {
			const files = await fs.readdir(currentDir);

			// Check for monorepo indicators
			if (files.includes('pnpm-workspace.yaml')) {
				return 'pnpm';
			}
			if (files.includes('yarn.lock')) {
				// Check if this is the root level (no parent has yarn.lock)
				const parentDir = path.dirname(currentDir);
				try {
					await fs.access(path.join(parentDir, 'yarn.lock'));
				} catch {
					// No yarn.lock in parent - this is root level
					return 'yarn';
				}
			}

			prevDir = currentDir;
			currentDir = path.dirname(currentDir);
		} catch {
			prevDir = currentDir;
			currentDir = path.dirname(currentDir);
		}
	}

	return null;
}

/**
 * Detects the package manager used in the project, with special handling for monorepos
 *
 * @param projectRoot - The root directory of the project
 * @returns The detected package manager
 */
export async function detectPackageManager(
	projectRoot: string
): Promise<PackageManager> {
	try {
		// First check if we're in a monorepo by looking for root-level package manager files
		const monorepoPackageManager =
			await findMonorepoPackageManager(projectRoot);
		if (monorepoPackageManager) {
			return monorepoPackageManager;
		}

		// If no monorepo indicators found, try package-manager-detector
		const result = await detect({ cwd: projectRoot });

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
			return detectedPm as PackageManager;
		}

		// If detection failed or returned something unexpected, throw to prompt the user
		let detectedValueStr = String(result);
		if (result && typeof result === 'object') {
			detectedValueStr = JSON.stringify(result);
		}
		throw new Error(
			`Could not reliably detect package manager (detected: ${detectedValueStr}).`
		);
	} catch (error) {
		// If detection fails or throws, prompt the user
		p.log.warn(
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
			p.log.warn('Package manager selection cancelled. Exiting.');
			process.exit(0);
		}

		return selectedPackageManager;
	}
}
