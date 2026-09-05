import fs from 'node:fs/promises';
import path from 'node:path';

import type { CliLogger } from '~/utils/logger';

/**
 * Supported c15t entry points. Every value resolves to the single `c15t`
 * umbrella package on npm; the subpath selects the framework integration
 * generated code imports from.
 */
export type AvailablePackages = 'c15t/next' | 'c15t/react' | 'c15t';

export type DevelopmentEnvironment = 'vite' | 'node';

/**
 * Framework detection result
 */
export interface FrameworkDetectionResult {
	developmentEnvironment?: DevelopmentEnvironment;
	framework: string | null;
	frameworkVersion: string | null;
	pkg: AvailablePackages;
	hasReact: boolean;
	reactVersion: string | null;
	tailwindVersion: string | null;
}

/**
 * Detects the framework and React usage in the project
 *
 * @param projectRoot - The root directory of the project
 * @param logger - Optional logger instance for debug messages
 * @returns Object containing framework info and whether React is used
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const detectFramework = async function detectFramework(
	projectRoot: string,
	logger?: CliLogger
): Promise<FrameworkDetectionResult> {
	try {
		logger?.debug(`Detecting framework in ${projectRoot}`);
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
		const deps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		const hasReact = 'react' in deps;
		const reactVersion = hasReact ? deps.react : null;
		logger?.debug(
			`React detected: ${hasReact}${reactVersion ? ` (version: ${reactVersion})` : ''}`
		);

		const tailwindVersion = deps.tailwindcss || null;
		logger?.debug(
			`Tailwind detected: ${!!tailwindVersion}${tailwindVersion ? ` (version: ${tailwindVersion})` : ''}`
		);

		let framework: string | null = null;
		let frameworkVersion: string | null = null;
		let pkg: AvailablePackages = hasReact ? 'c15t/react' : 'c15t';

		if ('next' in deps) {
			framework = 'Next.js';
			frameworkVersion = deps.next;
			pkg = 'c15t/next';
		} else if ('@remix-run/react' in deps) {
			framework = 'Remix';
			frameworkVersion = deps['@remix-run/react'];
		} else if (
			'@vitejs/plugin-react' in deps ||
			'@vitejs/plugin-react-swc' in deps
		) {
			framework = 'Vite + React';
			frameworkVersion =
				deps['@vitejs/plugin-react'] || deps['@vitejs/plugin-react-swc'];
		} else if ('gatsby' in deps) {
			framework = 'Gatsby';
			frameworkVersion = deps.gatsby;
		} else if (hasReact) {
			framework = 'React';
			frameworkVersion = reactVersion;
		}

		logger?.debug(
			`Detected framework: ${framework}${frameworkVersion ? ` (version: ${frameworkVersion})` : ''}, ` +
				`package: ${pkg}`
		);
		return {
			developmentEnvironment:
				!('next' in deps || 'gatsby' in deps || 'react-scripts' in deps) &&
				('vite' in deps ||
					'@vitejs/plugin-react' in deps ||
					'@vitejs/plugin-react-swc' in deps)
					? 'vite'
					: 'node',
			framework,
			frameworkVersion,
			hasReact,
			pkg,
			reactVersion,
			tailwindVersion,
		};
	} catch (error) {
		logger?.debug(
			`Framework detection failed: ${error instanceof Error ? error.message : String(error)}`
		);
		return {
			framework: null,
			frameworkVersion: null,
			hasReact: false,
			pkg: 'c15t',
			reactVersion: null,
			tailwindVersion: null,
		};
	}
};

/**
 * Detects the project root by finding the package.json file
 *
 * @param cwd - Current working directory
 * @param logger - Optional logger instance for debug messages
 * @returns The project root directory path or cwd if not found
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const detectProjectRoot = async function detectProjectRoot(
	cwd: string,
	logger?: CliLogger
): Promise<string> {
	let projectRoot = cwd;
	logger?.debug(`Starting project root detection from: ${cwd}`);

	try {
		let prevDir = '';
		let depth = 0;
		// Prevent infinite loops in case of circular symlinks
		const maxDepth = 10;

		while (projectRoot !== prevDir && depth < maxDepth) {
			logger?.debug(`Checking directory (depth ${depth}): ${projectRoot}`);

			try {
				const packageJsonPath = path.join(projectRoot, 'package.json');
				logger?.debug(`Looking for package.json at: ${packageJsonPath}`);

				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await fs.access(packageJsonPath);
				logger?.debug(`Found package.json at: ${projectRoot}`);
				// Found package.json
				break;
			} catch (error) {
				logger?.debug(
					`No package.json found in ${projectRoot}: ${error instanceof Error ? error.message : String(error)}`
				);
				prevDir = projectRoot;
				projectRoot = path.dirname(projectRoot);
				depth += 1;
			}
		}

		if (projectRoot === prevDir) {
			logger?.debug('Reached root directory without finding package.json');
			logger?.failed('Could not find project root (no package.json found)');
		}

		if (depth >= maxDepth) {
			logger?.debug(
				'Reached maximum directory depth without finding package.json'
			);
			logger?.failed(
				'Could not find project root (reached maximum directory depth)'
			);
		}

		logger?.debug(`Project root detection complete. Found at: ${projectRoot}`);
		return projectRoot;
	} catch (error) {
		logger?.debug(
			`Project root detection failed: ${error instanceof Error ? error.message : String(error)}`
		);
		logger?.debug(`Falling back to current directory: ${cwd}`);
		// Fallback to current directory if not found
		return cwd;
	}
};
