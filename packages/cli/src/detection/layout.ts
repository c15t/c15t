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

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

/** Resolve each wildcard directory independently, without treating names as patterns. */
const matchLayoutParts = async function matchLayoutParts(
	directory: string,
	parts: readonly string[]
): Promise<string[]> {
	const [part, ...remaining] = parts;
	if (part === undefined) {
		try {
			return (await fs.stat(directory)).isFile() ? [directory] : [];
		} catch {
			return [];
		}
	}
	if (part !== '*') {
		return matchLayoutParts(path.join(directory, part), remaining);
	}
	try {
		const entries = await fs.readdir(directory, { withFileTypes: true });
		const matches = await Promise.all(
			entries
				.filter((entry) => entry.isDirectory())
				.map((entry) =>
					matchLayoutParts(path.join(directory, entry.name), remaining)
				)
		);
		return matches.flat();
	} catch {
		return [];
	}
};

/** Find layout files in pattern order, including nested wildcard directories. */
const findMatchingFiles = async function findMatchingFiles(
	projectRoot: string,
	patterns: readonly string[],
	logger?: CliLogger
): Promise<string[]> {
	const results = await Promise.all(
		patterns.map((pattern) => matchLayoutParts(projectRoot, pattern.split('/')))
	);
	const matches = [...new Set(results.flat())].map((file) =>
		path.relative(projectRoot, file)
	);
	for (const match of matches) {
		logger?.debug(`Found layout: ${match}`);
	}
	return matches;
};

/**
 * Extract the locale segment from a path
 */
const extractLocaleSegment = function extractLocaleSegment(
	filepath: string
): string | undefined {
	const match = filepath.match(REGEX.DYNAMIC_SEGMENT);
	return match ? match[0] : undefined;
};

/**
 * Determine if a path contains a locale segment
 */
const hasLocaleSegment = function hasLocaleSegment(filepath: string): boolean {
	return REGEX.DYNAMIC_SEGMENT.test(filepath);
};

/**
 * Get the app directory from a layout path
 */
const getAppDirectory = function getAppDirectory(layoutPath: string): string {
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
	const localeIndex = parts.findIndex(
		(part, index) => index > appIndex && hasLocaleSegment(part)
	);
	if (localeIndex !== -1) {
		return parts.slice(0, localeIndex + 1).join(path.sep);
	}

	return parts.slice(0, appIndex + 1).join(path.sep);
};

/**
 * Find the layout file in a project
 *
 * This function searches for layout files in the following order:
 * 1. Exact matches (app/layout.tsx, src/app/layout.tsx)
 * 2. Dynamic segment matches (app/[locale]/layout.tsx)
 * 3. Pages router (_app.tsx)
 */
export const findLayoutFile = async function findLayoutFile(
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
			if (!aHasLocale && bHasLocale) {
				return -1;
			}
			if (aHasLocale && !bHasLocale) {
				return 1;
			}

			// Shorter paths come first
			return a.length - b.length;
		});

		const layoutPath = getDefined(appLayoutMatches[0]);
		const localeSegment = extractLocaleSegment(layoutPath);

		logger?.debug(`Selected layout: ${layoutPath}`);

		return {
			appDirectory: getAppDirectory(layoutPath),
			hasLocaleSegment: !!localeSegment,
			localeSegment,
			path: layoutPath,
			type: 'app',
		};
	}

	// Try Pages Router
	const pagesLayoutMatches = await findMatchingFiles(
		projectRoot,
		PAGES_APP_PATTERNS,
		logger
	);

	if (pagesLayoutMatches.length > 0) {
		const layoutPath = getDefined(pagesLayoutMatches[0]);

		logger?.debug(`Selected pages layout: ${layoutPath}`);

		return {
			appDirectory: getAppDirectory(layoutPath),
			hasLocaleSegment: false,
			path: layoutPath,
			type: 'pages',
		};
	}

	logger?.debug('No layout file found');
	return null;
};

/**
 * Determine if a project uses App Router
 */
export const isAppRouter = async function isAppRouter(
	projectRoot: string
): Promise<boolean> {
	const layout = await findLayoutFile(projectRoot);
	return layout?.type === 'app';
};

/**
 * Determine if a project uses Pages Router
 */
export const isPagesRouter = async function isPagesRouter(
	projectRoot: string
): Promise<boolean> {
	const layout = await findLayoutFile(projectRoot);
	return layout?.type === 'pages';
};

/**
 * Get the components directory path
 */
export const getComponentsDirectory = function getComponentsDirectory(
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
};

/**
 * Get the providers directory path
 */
export const getProvidersDirectory = function getProvidersDirectory(
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
};
