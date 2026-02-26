import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Node, Project, SyntaxKind } from 'ts-morph';

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
	CookieBanner: 'ConsentBanner',
	ConsentManagerDialog: 'ConsentDialog',
	ConsentManagerWidget: 'ConsentWidget',
	CookieBannerProps: 'ConsentBannerProps',
	ConsentManagerDialogProps: 'ConsentDialogProps',
	ConsentManagerWidgetProps: 'ConsentWidgetProps',
} as const;

type ComponentRenamesResult = {
	changed: boolean;
	operations: number;
	summaries: string[];
};

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
	changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}>;
	/**
	 * Non-fatal per-file transform errors.
	 */
	errors: Array<{ filePath: string; error: string }>;
}

function hasLegacyC15tComponentImport(
	sourceFile: import('ts-morph').SourceFile
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
}

function transformSourceFile(
	sourceFile: import('ts-morph').SourceFile
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
}

async function collectSourceFiles(rootDir: string): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isSymbolicLink()) {
				continue;
			}

			if (entry.isDirectory()) {
				if (IGNORED_DIRS.has(entry.name)) {
					continue;
				}
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
	}

	await walk(rootDir);
	return files;
}

/**
 * Runs a codemod that renames legacy React/Next.js component exports to v2 names.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export async function runComponentRenamesCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
		compilerOptions: {
			allowJs: true,
		},
	});
	const filePaths = await collectSourceFiles(options.projectRoot);

	const changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}> = [];
	const errors: Array<{ filePath: string; error: string }> = [];

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
				await sourceFile.save();
			}
		} catch (error) {
			errors.push({
				filePath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return {
		totalFiles: filePaths.length,
		changedFiles,
		errors,
	};
}
