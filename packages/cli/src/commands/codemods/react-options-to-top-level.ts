import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { Node, Project, SyntaxKind } from 'ts-morph';
import type { ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { forEachSequential } from '../../utils/for-each-sequential';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORED_DIRS = new Set([
	'.git',
	'.next',
	'.turbo',
	'coverage',
	'dist',
	'build',
	'node_modules',
	'out',
]);

const UI_OPTION_KEYS = ['theme', 'colorScheme', 'disableAnimation'] as const;

interface ReactOptionsResult {
	changed: boolean;
	operations: number;
	summaries: string[];
}

export interface CodemodRunOptions {
	/**
	 * Absolute or relative project root to scan for source files.
	 */
	projectRoot: string;
	/**
	 * Whether to skip saving transformed files.
	 */
	dryRun: boolean;
}

/**
 * Result summary for a codemod run.
 */
export interface CodemodRunResult {
	/**
	 * Number of source files scanned.
	 */
	totalFiles: number;
	/**
	 * Per-file transformation summaries.
	 */
	changedFiles: {
		filePath: string;
		operations: number;
		summaries: string[];
	}[];
	/**
	 * Non-fatal per-file transform errors.
	 */
	errors: { filePath: string; error: string }[];
}

const getPropertyName = function getPropertyName(
	property: PropertyAssignment
): string {
	const rawName = property.getNameNode().getText().trim();
	return rawName.replace(/^['"]|['"]$/gu, '');
};

const getProperty = function getProperty(
	objectLiteral: ObjectLiteralExpression,
	name: string
): PropertyAssignment | undefined {
	for (const property of objectLiteral.getProperties()) {
		if (!Node.isPropertyAssignment(property)) {
			continue;
		}

		if (getPropertyName(property) === name) {
			return property;
		}
	}

	return undefined;
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): ReactOptionsResult {
	let operations = 0;
	const summaries: string[] = [];

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);
	for (const property of propertyAssignments) {
		if (property.wasForgotten()) {
			continue;
		}

		if (getPropertyName(property) !== 'react') {
			continue;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!parentObject) {
			continue;
		}

		const reactObject = property.getInitializerIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!reactObject) {
			continue;
		}

		for (const key of UI_OPTION_KEYS) {
			const nestedProperty = getProperty(reactObject, key);
			if (!nestedProperty) {
				continue;
			}

			const initializerText = nestedProperty.getInitializer()?.getText();
			if (!initializerText) {
				continue;
			}

			if (getProperty(parentObject, key)) {
				summaries.push(`removed duplicate react.${key}`);
			} else {
				parentObject.addPropertyAssignment({
					initializer: initializerText,
					name: key,
				});
				summaries.push(`react.${key} -> ${key}`);
			}

			nestedProperty.remove();
			operations += 1;
		}

		if (reactObject.getProperties().length === 0) {
			property.remove();
			operations += 1;
			summaries.push('removed empty react options object');
		}
	}

	return {
		changed: operations > 0,
		operations,
		summaries: [...new Set(summaries)],
	};
};

const collectSourceFiles = async function collectSourceFiles(
	rootDir: string
): Promise<string[]> {
	const files: string[] = [];

	const walk = async function walk(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true });

		await forEachSequential(entries, {
			run: async (entry) => {
				if (entry.isSymbolicLink()) {
					return;
				}

				if (entry.isDirectory()) {
					if (IGNORED_DIRS.has(entry.name)) {
						return;
					}
					await walk(join(currentDir, entry.name));
					return;
				}

				if (!entry.isFile()) {
					return;
				}

				const extension = extname(entry.name).toLowerCase();
				if (!SUPPORTED_EXTENSIONS.has(extension)) {
					return;
				}

				files.push(join(currentDir, entry.name));
			},
		});
	};

	await walk(rootDir);
	return files;
};

/**
 * Runs a codemod that flattens legacy `react: { ... }` provider options.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runReactOptionsToTopLevelCodemod =
	async function runReactOptionsToTopLevelCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		const project = new Project({
			compilerOptions: {
				allowJs: true,
			},
			skipAddingFilesFromTsConfig: true,
		});
		const filePaths = await collectSourceFiles(options.projectRoot);

		const changedFiles: {
			filePath: string;
			operations: number;
			summaries: string[];
		}[] = [];
		const errors: { filePath: string; error: string }[] = [];

		await forEachSequential(filePaths, {
			run: async (filePath) => {
				try {
					const sourceFile = project.addSourceFileAtPathIfExists(filePath);
					if (!sourceFile) {
						return;
					}

					const result = transformSourceFile(sourceFile);
					if (!result.changed) {
						return;
					}

					changedFiles.push({
						filePath,
						operations: result.operations,
						summaries: result.summaries,
					});

					if (!options.dryRun) {
						await sourceFile.save();
					}
				} catch (error) {
					errors.push({
						error: error instanceof Error ? error.message : String(error),
						filePath,
					});
				}
			},
		});

		return {
			changedFiles,
			errors,
			totalFiles: filePaths.length,
		};
	};
