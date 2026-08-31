import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { Node, Project, SyntaxKind } from 'ts-morph';
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

const LEGACY_KEYS = new Set(['gdprTypes', 'initialGDPRTypes']);
const NEXT_KEY = 'consentCategories';

interface GdprTypesResult {
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
	property: TsMorphTypes.PropertyAssignment
): string {
	const rawName = property.getNameNode().getText().trim();
	return rawName.replace(/^['"]|['"]$/gu, '');
};

const objectHasConsentCategories = function objectHasConsentCategories(
	objectLiteral: TsMorphTypes.ObjectLiteralExpression
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
};

const getBindingPropertyName = function getBindingPropertyName(
	element: TsMorphTypes.BindingElement
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
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
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
 * Runs a codemod that migrates gdprTypes/initialGDPRTypes to consentCategories.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runGdprTypesToConsentCategoriesCodemod =
	async function runGdprTypesToConsentCategoriesCodemod(
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
