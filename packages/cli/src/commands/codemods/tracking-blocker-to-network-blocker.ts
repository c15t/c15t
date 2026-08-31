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

const LEGACY_CONFIG_KEY = 'trackingBlockerConfig';
const NEXT_CONFIG_KEY = 'networkBlocker';
const LEGACY_TYPE_NAME = 'TrackingBlockerConfig';
const NEXT_TYPE_NAME = 'NetworkBlockerConfig';
const C15T_PACKAGES = new Set(['c15t', '@c15t/react', '@c15t/nextjs']);

interface TrackingBlockerResult {
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

const invertExpression = function invertExpression(
	expressionText: string
): string {
	const trimmed = expressionText.trim();
	if (trimmed === 'true') {
		return 'false';
	}
	if (trimmed === 'false') {
		return 'true';
	}
	if (trimmed.startsWith('!')) {
		return trimmed.slice(1).trim();
	}
	return `!(${trimmed})`;
};

const getObjectPropertyKeyText = function getObjectPropertyKeyText(
	property: TsMorphTypes.ObjectLiteralElementLike
): string | undefined {
	if (!Node.isPropertyAssignment(property)) {
		return undefined;
	}

	const nameNode = property.getNameNode();
	if (Node.isIdentifier(nameNode)) {
		return nameNode.getText();
	}
	if (Node.isStringLiteral(nameNode)) {
		return nameNode.getLiteralText();
	}

	const raw = nameNode.getText();
	return raw.replace(/^['"]|['"]$/gu, '');
};

const buildRulesExpression = function buildRulesExpression(
	domainConsentMapInitializer: TsMorphTypes.Expression
): string {
	const domainMapObject = domainConsentMapInitializer.asKind(
		SyntaxKind.ObjectLiteralExpression
	);
	if (!domainMapObject) {
		const expressionText = domainConsentMapInitializer.getText();
		return `Object.entries(${expressionText}).map(([domain, category]) => ({ domain, category }))`;
	}

	const entries: string[] = [];
	for (const property of domainMapObject.getProperties()) {
		if (!Node.isPropertyAssignment(property)) {
			continue;
		}
		const key = getObjectPropertyKeyText(property);
		const value = property.getInitializer()?.getText();
		if (!key || !value) {
			continue;
		}

		entries.push(`{ domain: '${key}', category: ${value} }`);
	}

	if (entries.length === 0) {
		const expressionText = domainConsentMapInitializer.getText();
		return `Object.entries(${expressionText}).map(([domain, category]) => ({ domain, category }))`;
	}

	return `[${entries.join(', ')}]`;
};

const migrateTrackingBlockerObject = function migrateTrackingBlockerObject(
	trackingObject: ObjectLiteralExpression
): string {
	const disableAutomaticBlockingProperty = getProperty(
		trackingObject,
		'disableAutomaticBlocking'
	);
	const domainConsentMapProperty = getProperty(
		trackingObject,
		'domainConsentMap'
	);

	const enabledLine = disableAutomaticBlockingProperty
		? `enabled: ${invertExpression(disableAutomaticBlockingProperty.getInitializer()?.getText() ?? 'false')},`
		: '';

	const rulesExpression = domainConsentMapProperty?.getInitializer()
		? buildRulesExpression(
				domainConsentMapProperty.getInitializer() as TsMorphTypes.Expression
			)
		: '[]';

	const lines = [`rules: ${rulesExpression},`];
	if (enabledLine) {
		lines.unshift(enabledLine);
	}

	return `{
		${lines.join('\n\t\t')}
	}`;
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
): TrackingBlockerResult {
	let operations = 0;
	const summaries: string[] = [];
	let hasC15tTrackingTypeImport = false;

	const imports = sourceFile.getImportDeclarations();
	imports.forEach((importDeclaration) => {
		if (!C15T_PACKAGES.has(importDeclaration.getModuleSpecifierValue())) {
			return;
		}

		importDeclaration.getNamedImports().forEach((namedImport) => {
			if (namedImport.getNameNode().getText() !== LEGACY_TYPE_NAME) {
				return;
			}

			namedImport.getNameNode().replaceWithText(NEXT_TYPE_NAME);
			hasC15tTrackingTypeImport = true;
			operations += 1;
			summaries.push(`${LEGACY_TYPE_NAME} -> ${NEXT_TYPE_NAME}`);
		});
	});

	if (hasC15tTrackingTypeImport) {
		const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
		identifiers.forEach((identifier) => {
			if (identifier.getText() !== LEGACY_TYPE_NAME) {
				return;
			}

			const parent = identifier.getParent();
			if (
				Node.isImportSpecifier(parent) &&
				parent.getNameNode() === identifier
			) {
				return;
			}

			identifier.replaceWithText(NEXT_TYPE_NAME);
			operations += 1;
			summaries.push(`${LEGACY_TYPE_NAME} references -> ${NEXT_TYPE_NAME}`);
		});
	}

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);
	propertyAssignments.forEach((property) => {
		if (property.wasForgotten()) {
			return;
		}

		if (getPropertyName(property) !== LEGACY_CONFIG_KEY) {
			return;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!parentObject) {
			return;
		}

		if (getProperty(parentObject, NEXT_CONFIG_KEY)) {
			return;
		}

		const initializer = property.getInitializer();
		const trackingObject = initializer?.asKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (trackingObject) {
			property.getNameNode().replaceWithText(NEXT_CONFIG_KEY);
			property.setInitializer(migrateTrackingBlockerObject(trackingObject));
			operations += 1;
			summaries.push(
				'trackingBlockerConfig object -> networkBlocker rules/enabled'
			);
			return;
		}

		property.getNameNode().replaceWithText(NEXT_CONFIG_KEY);
		operations += 1;
		summaries.push('trackingBlockerConfig -> networkBlocker');
	});

	const shorthandAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.ShorthandPropertyAssignment
	);
	shorthandAssignments.forEach((shorthand) => {
		const name = shorthand.getNameNode().getText();
		if (name !== LEGACY_CONFIG_KEY) {
			return;
		}

		const parent = shorthand.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (parent && getProperty(parent, NEXT_CONFIG_KEY)) {
			return;
		}

		shorthand.replaceWithText(`${NEXT_CONFIG_KEY}: ${name}`);
		operations += 1;
		summaries.push('trackingBlockerConfig shorthand -> networkBlocker');
	});

	const bindingElements = sourceFile.getDescendantsOfKind(
		SyntaxKind.BindingElement
	);
	bindingElements.forEach((element) => {
		const propertyName = getBindingPropertyName(element);
		if (propertyName !== LEGACY_CONFIG_KEY) {
			return;
		}

		const propertyNameNode = element.getPropertyNameNode();
		if (propertyNameNode) {
			propertyNameNode.replaceWithText(NEXT_CONFIG_KEY);
		} else {
			const nameNode = element.getNameNode();
			if (!Node.isIdentifier(nameNode)) {
				return;
			}

			const localName = nameNode.getText();
			const initializerText = element.getInitializer()?.getText();
			let replacement = `${NEXT_CONFIG_KEY}: ${localName}`;
			if (initializerText) {
				replacement += ` = ${initializerText}`;
			}
			element.replaceWithText(replacement);
		}

		operations += 1;
		summaries.push('trackingBlockerConfig destructuring -> networkBlocker');
	});

	const propertyAccesses = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAccessExpression
	);
	propertyAccesses.forEach((propertyAccess) => {
		if (propertyAccess.getName() !== LEGACY_CONFIG_KEY) {
			return;
		}

		const expressionText = propertyAccess.getExpression().getText();
		propertyAccess.replaceWithText(`${expressionText}.${NEXT_CONFIG_KEY}`);
		operations += 1;
		summaries.push('trackingBlockerConfig access -> networkBlocker');
	});

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
 * Runs a codemod that migrates trackingBlockerConfig to networkBlocker config.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runTrackingBlockerToNetworkBlockerCodemod =
	async function runTrackingBlockerToNetworkBlockerCodemod(
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
