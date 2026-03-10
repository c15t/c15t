/**
 * Layout file detection module
 *
 * Detects layout files in Next.js projects, including those with
 * locale-based routing (e.g., app/[locale]/layout.tsx)
 *
 * This module fixes Issue #524 by using glob patterns to find layouts
 * in dynamic route segments.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { LAYOUT_PATTERNS, PAGES_APP_PATTERNS, REGEX } from '../constants';
import type { CliLogger, LayoutDetectionResult } from '../types';

/**
 * Simple glob matcher for our layout patterns
 */
function matchPattern(filepath: string, pattern: string): boolean {
	// Convert glob pattern to regex
	const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]+');
	const regex = new RegExp(`^${regexPattern}$`);
	return regex.test(filepath);
}

/**
 * Find files matching glob patterns
 */
async function findMatchingFiles(
	projectRoot: string,
	patterns: readonly string[],
	logger?: CliLogger
): Promise<string[]> {
	const matches: string[] = [];

	for (const pattern of patterns) {
		// Get the directory to search
		const parts = pattern.split('/');
		const hasWildcard = parts.some((p) => p === '*');

		if (hasWildcard) {
			// For patterns with wildcards, we need to walk the directory
			const baseParts: string[] = [];
			for (const part of parts) {
				if (part === '*') break;
				baseParts.push(part);
			}
			const baseDir = path.join(projectRoot, ...baseParts);

			try {
				const entries = await fs.readdir(baseDir, { withFileTypes: true });

				for (const entry of entries) {
					if (entry.isDirectory()) {
						// Build the potential path
						const remainingParts = parts.slice(baseParts.length + 1);
						const potentialPath = path.join(
							baseDir,
							entry.name,
							...remainingParts
						);
						const relativePath = path.relative(projectRoot, potentialPath);

						// Check if the pattern matches
						const patternWithDir = pattern.replace('*', entry.name);
						if (relativePath === patternWithDir.replace(/\//g, path.sep)) {
							try {
								await fs.access(potentialPath);
								logger?.debug(`Found layout: ${relativePath}`);
								matches.push(relativePath);
							} catch {
								// File doesn't exist
							}
						}
					}
				}
			} catch {
				// Directory doesn't exist
			}
		} else {
			// For exact patterns, just check if the file exists
			const filePath = path.join(projectRoot, pattern);
			try {
				await fs.access(filePath);
				logger?.debug(`Found layout: ${pattern}`);
				matches.push(pattern);
			} catch {
				// File doesn't exist
			}
		}
	}

	return matches;
}

/**
 * Extract the locale segment from a path
 */
function extractLocaleSegment(filepath: string): string | undefined {
	const match = filepath.match(REGEX.DYNAMIC_SEGMENT);
	return match ? match[0] : undefined;
}

/**
 * Determine if a path contains a locale segment
 */
function hasLocaleSegment(filepath: string): boolean {
	return REGEX.DYNAMIC_SEGMENT.test(filepath);
}

/**
 * Get the app directory from a layout path
 */
function getAppDirectory(layoutPath: string): string {
	const parts = layoutPath.split(path.sep);

	// Find the 'app' directory in the path
	const appIndex = parts.indexOf('app');
	if (appIndex === -1) {
		// For pages router, return the pages directory
		const pagesIndex = parts.indexOf('pages');
		if (pagesIndex !== -1) {
			return parts.slice(0, pagesIndex + 1).join(path.sep);
		}
		return path.dirname(layoutPath);
	}

	// For app router, return up to and including 'app'
	// If there's a locale segment, include it
	if (hasLocaleSegment(layoutPath)) {
		// Return app/[locale] or src/app/[locale]
		return parts.slice(0, appIndex + 2).join(path.sep);
	}

	return parts.slice(0, appIndex + 1).join(path.sep);
}

/**
 * Find the layout file in a project
 *
 * This function searches for layout files in the following order:
 * 1. Exact matches (app/layout.tsx, src/app/layout.tsx)
 * 2. Dynamic segment matches (app/[locale]/layout.tsx)
 * 3. Pages router (_app.tsx)
 */
export async function findLayoutFile(
	projectRoot: string,
	logger?: CliLogger
): Promise<LayoutDetectionResult | null> {
	logger?.debug(`Searching for layout file in ${projectRoot}`);

	// First, try to find App Router layouts
	const appLayoutMatches = await findMatchingFiles(
		projectRoot,
		LAYOUT_PATTERNS,
		logger
	);

	if (appLayoutMatches.length > 0) {
		// Sort by priority (exact matches first, then by path length)
		appLayoutMatches.sort((a, b) => {
			const aHasLocale = hasLocaleSegment(a);
			const bHasLocale = hasLocaleSegment(b);

			// Exact matches (without locale) come first
			if (!aHasLocale && bHasLocale) return -1;
			if (aHasLocale && !bHasLocale) return 1;

			// Shorter paths come first
			return a.length - b.length;
		});

		const layoutPath = appLayoutMatches[0]!;
		const localeSegment = extractLocaleSegment(layoutPath);

		logger?.debug(`Selected layout: ${layoutPath}`);

		return {
			path: layoutPath,
			type: 'app',
			hasLocaleSegment: !!localeSegment,
			localeSegment,
			appDirectory: getAppDirectory(layoutPath),
		};
	}

	// Try Pages Router
	const pagesLayoutMatches = await findMatchingFiles(
		projectRoot,
		PAGES_APP_PATTERNS,
		logger
	);

	if (pagesLayoutMatches.length > 0) {
		const layoutPath = pagesLayoutMatches[0]!;

		logger?.debug(`Selected pages layout: ${layoutPath}`);

		return {
			path: layoutPath,
			type: 'pages',
			hasLocaleSegment: false,
			appDirectory: getAppDirectory(layoutPath),
		};
	}

	logger?.debug('No layout file found');
	return null;
}

/**
 * Determine if a project uses App Router
 */
export async function isAppRouter(projectRoot: string): Promise<boolean> {
	const layout = await findLayoutFile(projectRoot);
	return layout?.type === 'app';
}

/**
 * Determine if a project uses Pages Router
 */
export async function isPagesRouter(projectRoot: string): Promise<boolean> {
	const layout = await findLayoutFile(projectRoot);
	return layout?.type === 'pages';
}

/**
 * Get the components directory path
 */
export function getComponentsDirectory(
	projectRoot: string,
	layout: LayoutDetectionResult
): string {
	// Determine if project uses src/ directory
	const usesSrc =
		layout.path.startsWith('src/') || layout.path.startsWith('src\\');

	if (usesSrc) {
		return path.join(projectRoot, 'src', 'components');
	}

	return path.join(projectRoot, 'components');
}

/**
 * Get the providers directory path
 */
export function getProvidersDirectory(
	projectRoot: string,
	layout: LayoutDetectionResult
): string {
	// Determine if project uses src/ directory
	const usesSrc =
		layout.path.startsWith('src/') || layout.path.startsWith('src\\');

	if (layout.type === 'app') {
		// For app router, providers go in app/ or src/app/
		if (usesSrc) {
			return path.join(projectRoot, 'src', 'app');
		}
		return path.join(projectRoot, 'app');
	}

	// For pages router, providers go in components/
	return getComponentsDirectory(projectRoot, layout);
}
