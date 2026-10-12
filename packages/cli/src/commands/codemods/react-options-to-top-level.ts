import { Node, SyntaxKind } from 'ts-morph';
import type { ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

const UI_OPTION_KEYS = ['theme', 'colorScheme', 'disableAnimation'] as const;

interface ReactOptionsResult {
	changed: boolean;
	operations: number;
	summaries: string[];
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

/**
 * Runs a codemod that flattens legacy `react: { ... }` provider options.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runReactOptionsToTopLevelCodemod =
	function runReactOptionsToTopLevelCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};

export type { CodemodRunOptions, CodemodRunResult } from './runner';
