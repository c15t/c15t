/**
 * Framework detection module
 *
 * Detects the framework being used in a project by analyzing package.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { type AvailablePackage, FRAMEWORK_KEYS, PACKAGES } from '../constants';
import type { CliLogger, FrameworkDetectionResult } from '../types';

/**
 * Detect the framework and React usage in the project
 */
export async function detectFramework(
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

		// Check for React
		const hasReact = FRAMEWORK_KEYS.REACT in deps;
		const reactVersion = hasReact ? deps[FRAMEWORK_KEYS.REACT] : null;
		logger?.debug(
			`React detected: ${hasReact}${reactVersion ? ` (version: ${reactVersion})` : ''}`
		);

		// Check for Tailwind
		const tailwindVersion = deps.tailwindcss || null;
		logger?.debug(
			`Tailwind detected: ${!!tailwindVersion}${tailwindVersion ? ` (version: ${tailwindVersion})` : ''}`
		);

		let framework: string | null = null;
		let frameworkVersion: string | null = null;
		let pkg: AvailablePackage = hasReact ? PACKAGES.REACT : PACKAGES.CORE;

		// Detect framework (order matters - more specific first)
		if (FRAMEWORK_KEYS.NEXT in deps) {
			framework = 'Next.js';
			frameworkVersion = deps[FRAMEWORK_KEYS.NEXT];
			pkg = PACKAGES.NEXTJS;
		} else if (FRAMEWORK_KEYS.REMIX in deps) {
			framework = 'Remix';
			frameworkVersion = deps[FRAMEWORK_KEYS.REMIX];
			// Remix uses React package
			pkg = PACKAGES.REACT;
		} else if (
			FRAMEWORK_KEYS.VITE_REACT in deps ||
			FRAMEWORK_KEYS.VITE_REACT_SWC in deps
		) {
			framework = 'Vite + React';
			frameworkVersion =
				deps[FRAMEWORK_KEYS.VITE_REACT] || deps[FRAMEWORK_KEYS.VITE_REACT_SWC];
			pkg = PACKAGES.REACT;
		} else if (FRAMEWORK_KEYS.GATSBY in deps) {
			framework = 'Gatsby';
			frameworkVersion = deps[FRAMEWORK_KEYS.GATSBY];
			pkg = PACKAGES.REACT;
		} else if (hasReact) {
			framework = 'React';
			frameworkVersion = reactVersion;
			pkg = PACKAGES.REACT;
		}

		logger?.debug(
			`Detected framework: ${framework || 'none'}${frameworkVersion ? ` (version: ${frameworkVersion})` : ''}, ` +
				`package: ${pkg}`
		);

		return {
			framework,
			frameworkVersion,
			pkg,
			hasReact,
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
			pkg: PACKAGES.CORE,
			hasReact: false,
			reactVersion: null,
			tailwindVersion: null,
		};
	}
}

/**
 * Detect the project root by finding the package.json file
 */
export async function detectProjectRoot(
	cwd: string,
	logger?: CliLogger
): Promise<string> {
	let projectRoot = cwd;
	logger?.debug(`Starting project root detection from: ${cwd}`);

	try {
		let prevDir = '';
		let depth = 0;
		const maxDepth = 10;

		while (projectRoot !== prevDir && depth < maxDepth) {
			logger?.debug(`Checking directory (depth ${depth}): ${projectRoot}`);

			try {
				const packageJsonPath = path.join(projectRoot, 'package.json');
				logger?.debug(`Looking for package.json at: ${packageJsonPath}`);

				await fs.access(packageJsonPath);
				logger?.debug(`Found package.json at: ${projectRoot}`);
				break;
			} catch {
				logger?.debug(`No package.json found in ${projectRoot}`);
				prevDir = projectRoot;
				projectRoot = path.dirname(projectRoot);
				depth++;
			}
		}

		if (projectRoot === prevDir) {
			logger?.debug('Reached root directory without finding package.json');
			logger?.warn('Could not find project root (no package.json found)');
		}

		if (depth >= maxDepth) {
			logger?.debug(
				'Reached maximum directory depth without finding package.json'
			);
			logger?.warn(
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
		return cwd;
	}
}

/**
 * Check if a framework is Next.js
 */
export function isNextJs(framework: FrameworkDetectionResult): boolean {
	return framework.framework === 'Next.js';
}

/**
 * Check if a framework is React-based
 */
export function isReactBased(framework: FrameworkDetectionResult): boolean {
	return framework.hasReact;
}

/**
 * Get the display name for a framework
 */
export function getFrameworkDisplayName(
	framework: FrameworkDetectionResult
): string {
	return framework.framework || 'JavaScript';
}

/**
 * Get the recommended package for a framework
 */
export function getRecommendedPackage(
	framework: FrameworkDetectionResult
): string {
	return framework.pkg;
}
