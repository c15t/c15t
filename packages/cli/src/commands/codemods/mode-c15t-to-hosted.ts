import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { Project, SyntaxKind } from 'ts-morph';
import type { PropertyAssignment } from 'ts-morph';
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

interface C15tModeToHostedResult {
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

/**
 * Returns an unquoted property key for comparisons.
 *
 * @param property Property assignment to inspect.
 * @returns Normalized property key without surrounding quotes.
 */
const getPropertyName = function getPropertyName(
	property: PropertyAssignment
): string {
	const rawName = property.getNameNode().getText().trim();
	return rawName.replace(/^['"]|['"]$/gu, '');
};

/**
 * Rewrites legacy `mode: 'c15t'` string literals to `mode: 'hosted'`.
 *
 * @param sourceFile Source file being transformed.
 * @returns Transformation summary for this source file.
 */
const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): C15tModeToHostedResult {
	let operations = 0;
	const summaries: string[] = [];

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);

	// oxlint-disable-next-line no-warning-comments -- Preserve declaration order, interface shape, and public compatibility.
	// TODO(codemod-scope): This codemod intentionally rewrites all object
	// properties shaped as `mode: 'c15t'` because projects often wrap c15t
	// config in custom helpers/types. We prefer broad migration coverage over
	// narrow AST heuristics that could miss valid config objects.
	for (const property of propertyAssignments) {
		if (getPropertyName(property) !== 'mode') {
			continue;
		}

		const initializer = property.getInitializerIfKind(SyntaxKind.StringLiteral);
		if (!initializer) {
			continue;
		}

		if (initializer.getLiteralValue() !== 'c15t') {
			continue;
		}

		initializer.setLiteralValue('hosted');
		operations += 1;
		summaries.push("mode 'c15t' -> 'hosted'");
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
 * Runs a codemod that migrates mode: 'c15t' to mode: 'hosted'.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 *
 * @throws {Error} Propagates unexpected setup failures such as directory traversal errors.
 */
export const runC15tModeToHostedCodemod =
	async function runC15tModeToHostedCodemod(
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
