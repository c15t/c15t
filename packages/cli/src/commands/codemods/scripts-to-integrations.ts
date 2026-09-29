import { Node, SyntaxKind } from 'ts-morph';
import type { SourceFile, StringLiteral } from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

const OLD_PACKAGE = '@c15t/scripts';
const NEW_PACKAGE = '@c15t/integrations';

const transformSourceFile = (sourceFile: SourceFile) => {
	let operations = 0;
	const rename = (literal: StringLiteral) => {
		const value = literal.getLiteralValue();
		if (value === OLD_PACKAGE || value.startsWith(`${OLD_PACKAGE}/`)) {
			literal.setLiteralValue(
				`${NEW_PACKAGE}${value.slice(OLD_PACKAGE.length)}`
			);
			operations += 1;
		}
	};

	for (const declaration of sourceFile.getImportDeclarations()) {
		rename(declaration.getModuleSpecifier());
	}
	for (const declaration of sourceFile.getExportDeclarations()) {
		const specifier = declaration.getModuleSpecifier();
		if (specifier) {
			rename(specifier);
		}
	}
	for (const call of sourceFile.getDescendantsOfKind(
		SyntaxKind.CallExpression
	)) {
		const expression = call.getExpression();
		const isImport = expression.getKind() === SyntaxKind.ImportKeyword;
		const isRequire =
			Node.isIdentifier(expression) &&
			expression.getText() === 'require' &&
			!expression
				.getSymbol()
				?.getDeclarations()
				.some((declaration) => declaration.getSourceFile() === sourceFile);
		const [argument] = call.getArguments();
		if ((isImport || isRequire) && argument && Node.isStringLiteral(argument)) {
			rename(argument);
		}
	}
	for (const type of sourceFile.getDescendantsOfKind(SyntaxKind.ImportType)) {
		const argument = type.getArgument();
		if (Node.isLiteralTypeNode(argument)) {
			const literal = argument.getLiteral();
			if (Node.isStringLiteral(literal)) {
				rename(literal);
			}
		}
	}
	return {
		changed: operations > 0,
		operations,
		summaries: operations > 0 ? [`${OLD_PACKAGE} -> ${NEW_PACKAGE}`] : [],
	};
};

/**
 * Renames vendor package imports in JavaScript and TypeScript sources for v3.
 *
 * @param options Codemod execution options.
 * @returns Source changes and per-file errors. Dependencies are updated separately.
 */
export const runScriptsToIntegrationsCodemod = (
	options: CodemodRunOptions
): Promise<CodemodRunResult> => runTransform(options, transformSourceFile);
