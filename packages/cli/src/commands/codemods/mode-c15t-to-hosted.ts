import { Node, SyntaxKind } from 'ts-morph';
import type { PropertyAssignment } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { isC15tOptionsObject } from './config-scope';
import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

interface C15tModeToHostedResult {
	changed: boolean;
	operations: number;
	summaries: string[];
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

	for (const property of propertyAssignments) {
		const object = property.getParent();
		if (
			!Node.isObjectLiteralExpression(object) ||
			!isC15tOptionsObject(object)
		) {
			continue;
		}
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

/**
 * Runs a codemod that migrates mode: 'c15t' to mode: 'hosted'.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 *
 * @throws {Error} Propagates unexpected setup failures such as directory traversal errors.
 */
export const runC15tModeToHostedCodemod = function runC15tModeToHostedCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	return runTransform(options, transformSourceFile);
};

export type { CodemodRunOptions, CodemodRunResult } from './runner';
