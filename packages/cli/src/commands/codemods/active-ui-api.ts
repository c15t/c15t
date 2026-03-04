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

const BOOLEAN_STATE_PROPERTIES = {
	showPopup: 'banner',
	isPrivacyDialogOpen: 'dialog',
} as const;

const LEGACY_SETTER_NAMES = {
	setShowPopup: 'banner',
	setIsPrivacyDialogOpen: 'dialog',
} as const;

type ActiveUiApiResult = {
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

function mapBooleanExpressionToUi(
	expressionText: string | undefined,
	activeValue: 'banner' | 'dialog'
): string {
	const trimmed = expressionText?.trim();
	if (!trimmed || trimmed === 'true') {
		return `'${activeValue}'`;
	}

	if (trimmed === 'false') {
		return "'none'";
	}

	return `${trimmed} ? '${activeValue}' : 'none'`;
}

function mapShowPopupCall(
	callee: string,
	args: string[]
): { text: string; operations: number } {
	const uiArgument = mapBooleanExpressionToUi(args[0], 'banner');
	const forceArg = args[1]?.trim();
	if (!forceArg || forceArg === 'false' || forceArg === 'undefined') {
		return { text: `${callee}(${uiArgument})`, operations: 1 };
	}

	if (forceArg === 'true') {
		return {
			text: `${callee}(${uiArgument}, { force: true })`,
			operations: 1,
		};
	}

	return {
		text: `${callee}(${uiArgument}, ${forceArg} ? { force: true } : undefined)`,
		operations: 1,
	};
}

function mapPrivacyDialogCall(callee: string, args: string[]): string {
	const uiArgument = mapBooleanExpressionToUi(args[0], 'dialog');
	return `${callee}(${uiArgument})`;
}

function transformSourceFile(
	sourceFile: import('ts-morph').SourceFile
): ActiveUiApiResult {
	let operations = 0;
	const summaries: string[] = [];

	const booleanAliases = new Map<string, 'banner' | 'dialog'>();
	const setterAliases = new Map<
		string,
		'setShowPopup' | 'setIsPrivacyDialogOpen'
	>();

	const bindingElements = sourceFile.getDescendantsOfKind(
		SyntaxKind.BindingElement
	);
	for (const element of bindingElements) {
		const propertyName = getBindingPropertyName(element);
		if (!propertyName) {
			continue;
		}

		const localNameNode = element.getNameNode();
		if (!Node.isIdentifier(localNameNode)) {
			continue;
		}
		const localName = localNameNode.getText();

		if (propertyName in BOOLEAN_STATE_PROPERTIES) {
			const stateValue =
				BOOLEAN_STATE_PROPERTIES[
					propertyName as keyof typeof BOOLEAN_STATE_PROPERTIES
				];
			booleanAliases.set(localName, stateValue);

			const propertyNameNode = element.getPropertyNameNode();
			if (propertyNameNode) {
				propertyNameNode.replaceWithText('activeUI');
			} else {
				const initializerText = element.getInitializer()?.getText();
				let replacement = `activeUI: ${localName}`;
				if (initializerText) {
					replacement += ` = ${initializerText}`;
				}
				element.replaceWithText(replacement);
			}

			operations += 1;
			summaries.push(`${propertyName} -> activeUI`);
			continue;
		}

		if (propertyName in LEGACY_SETTER_NAMES) {
			setterAliases.set(
				localName,
				propertyName as keyof typeof LEGACY_SETTER_NAMES
			);

			const propertyNameNode = element.getPropertyNameNode();
			if (propertyNameNode) {
				propertyNameNode.replaceWithText('setActiveUI');
			} else {
				const initializerText = element.getInitializer()?.getText();
				let replacement = `setActiveUI: ${localName}`;
				if (initializerText) {
					replacement += ` = ${initializerText}`;
				}
				element.replaceWithText(replacement);
			}

			operations += 1;
			summaries.push(`${propertyName} -> setActiveUI alias`);
		}
	}

	const callExpressions = sourceFile.getDescendantsOfKind(
		SyntaxKind.CallExpression
	);
	for (const callExpression of callExpressions) {
		const expression = callExpression.getExpression();
		const args = callExpression
			.getArguments()
			.map((argument) => argument.getText());

		if (Node.isPropertyAccessExpression(expression)) {
			const methodName = expression.getName();
			if (!(methodName in LEGACY_SETTER_NAMES)) {
				continue;
			}

			const receiver = expression.getExpression().getText();
			const callee = `${receiver}.setActiveUI`;
			let replacement = '';

			if (methodName === 'setShowPopup') {
				replacement = mapShowPopupCall(callee, args).text;
				summaries.push('setShowPopup(...) -> setActiveUI(...)');
			} else {
				replacement = mapPrivacyDialogCall(callee, args);
				summaries.push('setIsPrivacyDialogOpen(...) -> setActiveUI(...)');
			}

			callExpression.replaceWithText(replacement);
			operations += 1;
			continue;
		}

		if (!Node.isIdentifier(expression)) {
			continue;
		}

		const calleeName = expression.getText();
		const aliasKind = setterAliases.get(calleeName);
		if (!aliasKind) {
			continue;
		}

		if (aliasKind === 'setShowPopup') {
			const mapped = mapShowPopupCall(calleeName, args);
			callExpression.replaceWithText(mapped.text);
			summaries.push('setShowPopup alias call -> setActiveUI args');
		} else {
			callExpression.replaceWithText(mapPrivacyDialogCall(calleeName, args));
			summaries.push('setIsPrivacyDialogOpen alias call -> setActiveUI args');
		}
		operations += 1;
	}

	const propertyAccesses = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAccessExpression
	);
	for (const propertyAccess of propertyAccesses) {
		const propertyName = propertyAccess.getName();
		if (!(propertyName in BOOLEAN_STATE_PROPERTIES)) {
			continue;
		}

		const parent = propertyAccess.getParent();
		if (
			Node.isBinaryExpression(parent) &&
			parent.getLeft() === propertyAccess
		) {
			continue;
		}

		const receiver = propertyAccess.getExpression().getText();
		const activeValue =
			BOOLEAN_STATE_PROPERTIES[
				propertyName as keyof typeof BOOLEAN_STATE_PROPERTIES
			];
		propertyAccess.replaceWithText(
			`(${receiver}.activeUI === '${activeValue}')`
		);
		operations += 1;
		summaries.push(`${propertyName} state check -> activeUI comparison`);
	}

	const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
	for (const identifier of identifiers) {
		if (identifier.wasForgotten()) {
			continue;
		}

		const identifierText = identifier.getText();
		const aliasTarget = booleanAliases.get(identifierText);
		if (!aliasTarget) {
			continue;
		}

		const parent = identifier.getParent();
		if (Node.isBindingElement(parent) && parent.getNameNode() === identifier) {
			continue;
		}

		if (
			Node.isPropertyAccessExpression(parent) &&
			parent.getNameNode() === identifier
		) {
			continue;
		}

		if (
			Node.isPropertyAssignment(parent) &&
			parent.getNameNode() === identifier
		) {
			continue;
		}

		if (Node.isShorthandPropertyAssignment(parent)) {
			const name = identifierText;
			parent.replaceWithText(`${name}: (${name} === '${aliasTarget}')`);
			operations += 1;
			summaries.push(`${name} shorthand -> activeUI comparison`);
			continue;
		}

		identifier.replaceWithText(`(${identifierText} === '${aliasTarget}')`);
		operations += 1;
		summaries.push(`${identifierText} usage -> activeUI comparison`);
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
 * Runs a codemod that migrates showPopup/isPrivacyDialogOpen APIs to activeUI.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export async function runActiveUiApiCodemod(
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
