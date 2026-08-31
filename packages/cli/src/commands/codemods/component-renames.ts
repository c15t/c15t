import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { Node, Project, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

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

const C15T_REACT_PACKAGES = new Set(['@c15t/react', '@c15t/nextjs']);

const RENAME_MAP = {
	ConsentManagerDialog: 'ConsentDialog',
	ConsentManagerDialogProps: 'ConsentDialogProps',
	ConsentManagerWidget: 'ConsentWidget',
	ConsentManagerWidgetProps: 'ConsentWidgetProps',
	CookieBanner: 'ConsentBanner',
	CookieBannerProps: 'ConsentBannerProps',
} as const;

interface ComponentRenamesResult {
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

const hasLegacyC15tComponentImport = function hasLegacyC15tComponentImport(
	sourceFile: TsMorphTypes.SourceFile
): boolean {
	for (const importDeclaration of sourceFile.getImportDeclarations()) {
		const specifier = importDeclaration.getModuleSpecifierValue();
		if (!C15T_REACT_PACKAGES.has(specifier)) {
			continue;
		}

		for (const namedImport of importDeclaration.getNamedImports()) {
			const importedName = namedImport.getNameNode().getText();
			if (importedName in RENAME_MAP) {
				return true;
			}
		}
	}

	return false;
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): ComponentRenamesResult {
	if (!hasLegacyC15tComponentImport(sourceFile)) {
		return { changed: false, operations: 0, summaries: [] };
	}

	let operations = 0;
	const summaries: string[] = [];

	const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
	for (const identifier of identifiers) {
		const identifierText = identifier.getText();
		if (!(identifierText in RENAME_MAP)) {
			continue;
		}

		const replacement = RENAME_MAP[identifierText as keyof typeof RENAME_MAP];
		const parent = identifier.getParent();

		if (
			Node.isPropertyAssignment(parent) &&
			parent.getNameNode() === identifier
		) {
			continue;
		}

		if (
			Node.isPropertyAccessExpression(parent) &&
			parent.getNameNode() === identifier
		) {
			continue;
		}

		if (
			Node.isImportSpecifier(parent) &&
			parent.getAliasNode() === identifier
		) {
			continue;
		}

		if (
			Node.isShorthandPropertyAssignment(parent) &&
			parent.getNameNode() === identifier
		) {
			continue;
		}

		identifier.replaceWithText(replacement);
		operations += 1;
		summaries.push(`${identifierText} -> ${replacement}`);
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

		for (const entry of entries) {
			if (entry.isSymbolicLink()) {
				continue;
			}

			if (entry.isDirectory()) {
				if (IGNORED_DIRS.has(entry.name)) {
					continue;
				}
				// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
				await walk(join(currentDir, entry.name));
				continue;
			}

			if (!entry.isFile()) {
				continue;
			}

			const extension = extname(entry.name).toLowerCase();
			if (!SUPPORTED_EXTENSIONS.has(extension)) {
				continue;
			}

			files.push(join(currentDir, entry.name));
		}
	};

	await walk(rootDir);
	return files;
};

/**
 * Runs a codemod that renames legacy React/Next.js component exports to v2 names.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runComponentRenamesCodemod =
	async function runComponentRenamesCodemod(
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

		for (const filePath of filePaths) {
			try {
				const sourceFile = project.addSourceFileAtPathIfExists(filePath);
				if (!sourceFile) {
					continue;
				}

				const result = transformSourceFile(sourceFile);
				if (!result.changed) {
					continue;
				}

				changedFiles.push({
					filePath,
					operations: result.operations,
					summaries: result.summaries,
				});

				if (!options.dryRun) {
					// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
					await sourceFile.save();
				}
			} catch (error) {
				errors.push({
					error: error instanceof Error ? error.message : String(error),
					filePath,
				});
			}
		}

		return {
			changedFiles,
			errors,
			totalFiles: filePaths.length,
		};
	};
