import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

const BOOLEAN_STATE_PROPERTIES = {
	isPrivacyDialogOpen: 'dialog',
	showPopup: 'banner',
} as const;

const LEGACY_SETTER_NAMES = {
	setIsPrivacyDialogOpen: 'dialog',
	setShowPopup: 'banner',
} as const;

interface ActiveUiApiResult {
	changed: boolean;
	operations: number;
	summaries: string[];
}

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

const mapBooleanExpressionToUi = function mapBooleanExpressionToUi(
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
};

const mapShowPopupCall = function mapShowPopupCall(
	callee: string,
	args: string[]
): { text: string; operations: number } {
	const uiArgument = mapBooleanExpressionToUi(args[0], 'banner');
	const forceArg = args[1]?.trim();
	if (!forceArg || forceArg === 'false' || forceArg === 'undefined') {
		return { operations: 1, text: `${callee}(${uiArgument})` };
	}

	if (forceArg === 'true') {
		return {
			operations: 1,
			text: `${callee}(${uiArgument}, { force: true })`,
		};
	}

	return {
		operations: 1,
		text: `${callee}(${uiArgument}, ${forceArg} ? { force: true } : undefined)`,
	};
};

const mapPrivacyDialogCall = function mapPrivacyDialogCall(
	callee: string,
	args: string[]
): string {
	const uiArgument = mapBooleanExpressionToUi(args[0], 'dialog');
	return `${callee}(${uiArgument})`;
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
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
	bindingElements.forEach((element) => {
		const propertyName = getBindingPropertyName(element);
		if (!propertyName) {
			return;
		}

		const localNameNode = element.getNameNode();
		if (!Node.isIdentifier(localNameNode)) {
			return;
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
			return;
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
	});

	const callExpressions = sourceFile.getDescendantsOfKind(
		SyntaxKind.CallExpression
	);
	callExpressions.forEach((callExpression) => {
		const expression = callExpression.getExpression();
		const args = callExpression
			.getArguments()
			.map((argument) => argument.getText());

		if (Node.isPropertyAccessExpression(expression)) {
			const methodName = expression.getName();
			if (!(methodName in LEGACY_SETTER_NAMES)) {
				return;
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
			return;
		}

		if (!Node.isIdentifier(expression)) {
			return;
		}

		const calleeName = expression.getText();
		const aliasKind = setterAliases.get(calleeName);
		if (!aliasKind) {
			return;
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
	});

	const propertyAccesses = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAccessExpression
	);
	propertyAccesses.forEach((propertyAccess) => {
		const propertyName = propertyAccess.getName();
		if (!(propertyName in BOOLEAN_STATE_PROPERTIES)) {
			return;
		}

		const parent = propertyAccess.getParent();
		if (
			Node.isBinaryExpression(parent) &&
			parent.getLeft() === propertyAccess
		) {
			return;
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
	});

	const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
	identifiers.forEach((identifier) => {
		if (identifier.wasForgotten()) {
			return;
		}

		const identifierText = identifier.getText();
		const aliasTarget = booleanAliases.get(identifierText);
		if (!aliasTarget) {
			return;
		}

		const parent = identifier.getParent();
		if (Node.isBindingElement(parent) && parent.getNameNode() === identifier) {
			return;
		}

		if (
			Node.isPropertyAccessExpression(parent) &&
			parent.getNameNode() === identifier
		) {
			return;
		}

		if (
			Node.isPropertyAssignment(parent) &&
			parent.getNameNode() === identifier
		) {
			return;
		}

		if (Node.isShorthandPropertyAssignment(parent)) {
			const name = identifierText;
			parent.replaceWithText(`${name}: (${name} === '${aliasTarget}')`);
			operations += 1;
			summaries.push(`${name} shorthand -> activeUI comparison`);
			return;
		}

		identifier.replaceWithText(`(${identifierText} === '${aliasTarget}')`);
		operations += 1;
		summaries.push(`${identifierText} usage -> activeUI comparison`);
	});

	return {
		changed: operations > 0,
		operations,
		summaries: [...new Set(summaries)],
	};
};

/**
 * Runs a codemod that migrates showPopup/isPrivacyDialogOpen APIs to activeUI.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runActiveUiApiCodemod = function runActiveUiApiCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	return runTransform(options, transformSourceFile);
};

export type { CodemodRunOptions, CodemodRunResult } from './runner';
