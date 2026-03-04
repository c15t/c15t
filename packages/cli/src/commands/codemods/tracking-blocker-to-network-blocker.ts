import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
	Node,
	type ObjectLiteralExpression,
	Project,
	type PropertyAssignment,
	SyntaxKind,
} from 'ts-morph';

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

type TrackingBlockerResult = {
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

function getPropertyName(property: PropertyAssignment): string {
	const rawName = property.getNameNode().getText().trim();
	return rawName.replace(/^['"]|['"]$/g, '');
}

function getProperty(
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
}

function invertExpression(expressionText: string): string {
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
}

function getObjectPropertyKeyText(
	property: import('ts-morph').ObjectLiteralElementLike
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
	return raw.replace(/^['"]|['"]$/g, '');
}

function buildRulesExpression(
	domainConsentMapInitializer: import('ts-morph').Expression
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
}

function migrateTrackingBlockerObject(
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
				domainConsentMapProperty.getInitializer() as import('ts-morph').Expression
			)
		: '[]';

	const lines = [`rules: ${rulesExpression},`];
	if (enabledLine) {
		lines.unshift(enabledLine);
	}

	return `{
		${lines.join('\n\t\t')}
	}`;
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
): TrackingBlockerResult {
	let operations = 0;
	const summaries: string[] = [];
	let hasC15tTrackingTypeImport = false;

	const imports = sourceFile.getImportDeclarations();
	for (const importDeclaration of imports) {
		if (!C15T_PACKAGES.has(importDeclaration.getModuleSpecifierValue())) {
			continue;
		}

		for (const namedImport of importDeclaration.getNamedImports()) {
			if (namedImport.getNameNode().getText() !== LEGACY_TYPE_NAME) {
				continue;
			}

			namedImport.getNameNode().replaceWithText(NEXT_TYPE_NAME);
			hasC15tTrackingTypeImport = true;
			operations += 1;
			summaries.push(`${LEGACY_TYPE_NAME} -> ${NEXT_TYPE_NAME}`);
		}
	}

	if (hasC15tTrackingTypeImport) {
		const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
		for (const identifier of identifiers) {
			if (identifier.getText() !== LEGACY_TYPE_NAME) {
				continue;
			}

			const parent = identifier.getParent();
			if (
				Node.isImportSpecifier(parent) &&
				parent.getNameNode() === identifier
			) {
				continue;
			}

			identifier.replaceWithText(NEXT_TYPE_NAME);
			operations += 1;
			summaries.push(`${LEGACY_TYPE_NAME} references -> ${NEXT_TYPE_NAME}`);
		}
	}

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);
	for (const property of propertyAssignments) {
		if (property.wasForgotten()) {
			continue;
		}

		if (getPropertyName(property) !== LEGACY_CONFIG_KEY) {
			continue;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!parentObject) {
			continue;
		}

		if (getProperty(parentObject, NEXT_CONFIG_KEY)) {
			continue;
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
			continue;
		}

		property.getNameNode().replaceWithText(NEXT_CONFIG_KEY);
		operations += 1;
		summaries.push('trackingBlockerConfig -> networkBlocker');
	}

	const shorthandAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.ShorthandPropertyAssignment
	);
	for (const shorthand of shorthandAssignments) {
		const name = shorthand.getNameNode().getText();
		if (name !== LEGACY_CONFIG_KEY) {
			continue;
		}

		const parent = shorthand.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (parent && getProperty(parent, NEXT_CONFIG_KEY)) {
			continue;
		}

		shorthand.replaceWithText(`${NEXT_CONFIG_KEY}: ${name}`);
		operations += 1;
		summaries.push('trackingBlockerConfig shorthand -> networkBlocker');
	}

	const bindingElements = sourceFile.getDescendantsOfKind(
		SyntaxKind.BindingElement
	);
	for (const element of bindingElements) {
		const propertyName = getBindingPropertyName(element);
		if (propertyName !== LEGACY_CONFIG_KEY) {
			continue;
		}

		const propertyNameNode = element.getPropertyNameNode();
		if (propertyNameNode) {
			propertyNameNode.replaceWithText(NEXT_CONFIG_KEY);
		} else {
			const nameNode = element.getNameNode();
			if (!Node.isIdentifier(nameNode)) {
				continue;
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
	}

	const propertyAccesses = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAccessExpression
	);
	for (const propertyAccess of propertyAccesses) {
		if (propertyAccess.getName() !== LEGACY_CONFIG_KEY) {
			continue;
		}

		const expressionText = propertyAccess.getExpression().getText();
		propertyAccess.replaceWithText(`${expressionText}.${NEXT_CONFIG_KEY}`);
		operations += 1;
		summaries.push('trackingBlockerConfig access -> networkBlocker');
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
 * Runs a codemod that migrates trackingBlockerConfig to networkBlocker config.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export async function runTrackingBlockerToNetworkBlockerCodemod(
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
