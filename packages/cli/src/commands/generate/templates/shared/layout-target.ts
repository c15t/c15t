import { Node, SyntaxKind } from 'ts-morph';
import type { Expression, SourceFile } from 'ts-morph';

/** Finds return expressions belonging to the exported application component. */
export const getLayoutExpressions = function getLayoutExpressions(
	source: SourceFile
): Expression[] {
	const resolve = (node: Node | undefined): Node | undefined => {
		if (!node) {
			return undefined;
		}
		if (
			Node.isParenthesizedExpression(node) ||
			Node.isAsExpression(node) ||
			Node.isSatisfiesExpression(node)
		) {
			return resolve(node.getExpression());
		}
		if (Node.isIdentifier(node)) {
			return resolve(
				source.getVariableDeclaration(node.getText())?.getInitializer() ??
					source.getFunction(node.getText())
			);
		}
		return node;
	};
	const component = resolve(
		source.getFunctions().find((fn) => fn.isDefaultExport()) ??
			source
				.getExportAssignment((item) => !item.isExportEquals())
				?.getExpression() ??
			source.getVariableDeclaration('App')?.getInitializer() ??
			source.getFunction('App')
	);
	if (
		!component ||
		!(
			Node.isFunctionDeclaration(component) ||
			Node.isFunctionExpression(component) ||
			Node.isArrowFunction(component)
		)
	) {
		throw new Error(
			`Cannot identify the exported application component in ${source.getFilePath()}. Follow the framework quickstart to add ConsentProvider manually.`
		);
	}
	const body = component.getBody();
	if (!body) {
		throw new Error('The application component has no body.');
	}
	if (Node.isExpression(body)) {
		return [body];
	}
	const expressions = body
		.getDescendantsOfKind(SyntaxKind.ReturnStatement)
		.filter(
			(statement) =>
				statement.getFirstAncestor(
					(node) =>
						Node.isFunctionDeclaration(node) ||
						Node.isFunctionExpression(node) ||
						Node.isArrowFunction(node)
				) === component
		)
		.flatMap((statement) => {
			const expression = statement.getExpression();
			return expression ? [expression] : [];
		});
	if (!expressions.length) {
		throw new Error(
			`No component return expression in ${source.getFilePath()}.`
		);
	}
	return expressions;
};
