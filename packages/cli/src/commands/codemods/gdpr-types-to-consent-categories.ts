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

const LEGACY_KEYS = new Set(['gdprTypes', 'initialGDPRTypes']);
const NEXT_KEY = 'consentCategories';

type GdprTypesResult = {
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

function getPropertyName(
	property: import('ts-morph').PropertyAssignment
): string {
	const rawName = property.getNameNode().getText().trim();
	return rawName.replace(/^['"]|['"]$/g, '');
}

function objectHasConsentCategories(
	objectLiteral: import('ts-morph').ObjectLiteralExpression
): boolean {
	for (const property of objectLiteral.getProperties()) {
		if (!Node.isPropertyAssignment(property)) {
			continue;
		}

		if (getPropertyName(property) === NEXT_KEY) {
			return true;
		}
	}

	return false;
}

function getBindingPropertyName(
	element: import('ts-morph').BindingElement
): string | undefined {
	const propertyNameNode = element.getPropertyNameNode();
	if (propertyNameNode) {
		if (Node.isIdentifier(propertyNameNode)) {
			return propertyNameNode.getText();
		}

		if (Node.isStringLiteral(propertyNameNode)) {
			return propertyNameNode.getLiteralText();
		}

		return undefined;
	}

	const nameNode = element.getNameNode();
	if (!Node.isIdentifier(nameNode)) {
		return undefined;
	}

	return nameNode.getText();
}

function transformSourceFile(
	sourceFile: import('ts-morph').SourceFile
): GdprTypesResult {
	let operations = 0;
	const summaries: string[] = [];

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);
	for (const property of propertyAssignments) {
		const name = getPropertyName(property);
		if (!LEGACY_KEYS.has(name)) {
			continue;
		}

		const parent = property.getParentIfKind(SyntaxKind.ObjectLiteralExpression);
		if (parent && objectHasConsentCategories(parent)) {
			continue;
		}

		property.getNameNode().replaceWithText(NEXT_KEY);
		operations += 1;
		summaries.push(`${name} -> ${NEXT_KEY}`);
	}

	const shorthandAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.ShorthandPropertyAssignment
	);
	for (const shorthand of shorthandAssignments) {
		const name = shorthand.getNameNode().getText();
		if (!LEGACY_KEYS.has(name)) {
			continue;
		}

		const parent = shorthand.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (parent && objectHasConsentCategories(parent)) {
			continue;
		}

		shorthand.replaceWithText(`${NEXT_KEY}: ${name}`);
		operations += 1;
		summaries.push(`${name} shorthand -> ${NEXT_KEY}`);
	}

	const bindingElements = sourceFile.getDescendantsOfKind(
		SyntaxKind.BindingElement
	);
	for (const element of bindingElements) {
		const propertyName = getBindingPropertyName(element);
		if (!propertyName || !LEGACY_KEYS.has(propertyName)) {
			continue;
		}

		const propertyNameNode = element.getPropertyNameNode();
		if (propertyNameNode) {
			propertyNameNode.replaceWithText(NEXT_KEY);
		} else {
			const nameNode = element.getNameNode();
			if (!Node.isIdentifier(nameNode)) {
				continue;
			}

			const localName = nameNode.getText();
			const initializerText = element.getInitializer()?.getText();
			let replacement = `${NEXT_KEY}: ${localName}`;
			if (initializerText) {
				replacement += ` = ${initializerText}`;
			}
			element.replaceWithText(replacement);
		}

		operations += 1;
		summaries.push(`${propertyName} destructuring -> ${NEXT_KEY}`);
	}

	const propertyAccesses = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAccessExpression
	);
	for (const propertyAccess of propertyAccesses) {
		const name = propertyAccess.getName();
		if (!LEGACY_KEYS.has(name)) {
			continue;
		}

		const expressionText = propertyAccess.getExpression().getText();
		propertyAccess.replaceWithText(`${expressionText}.${NEXT_KEY}`);
		operations += 1;
		summaries.push(`${name} access -> ${NEXT_KEY}`);
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
 * Runs a codemod that migrates gdprTypes/initialGDPRTypes to consentCategories.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export async function runGdprTypesToConsentCategoriesCodemod(
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
