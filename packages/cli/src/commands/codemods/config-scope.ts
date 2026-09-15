import { Node } from 'ts-morph';
import type { ObjectLiteralExpression } from 'ts-morph';

const CONFIG_CALLS = new Set([
	'createConsentManager',
	'defineConfig',
	'configureConsentManager',
]);
const PROVIDERS = new Set(['ConsentManagerProvider', 'ConsentProvider']);
const PACKAGES = new Set([
	'c15t',
	'c15t/react',
	'c15t/next',
	'@c15t/core',
	'@c15t/react',
	'@c15t/nextjs',
	'@c15t/backend',
]);

const isImportedName = (node: Node, allowed: ReadonlySet<string>): boolean => {
	if (!Node.isIdentifier(node)) {
		return false;
	}
	return (
		node
			.getSymbol()
			?.getDeclarations()
			.some((declaration) => {
				if (!Node.isImportSpecifier(declaration)) {
					return false;
				}
				return (
					allowed.has(declaration.getName()) &&
					PACKAGES.has(
						declaration.getImportDeclaration().getModuleSpecifierValue()
					)
				);
			}) ?? false
	);
};

const isOptionsUse = (node: Node): boolean => {
	const parent = node.getParent();
	if (Node.isCallExpression(parent) && parent.getArguments().includes(node)) {
		return isImportedName(parent.getExpression(), CONFIG_CALLS);
	}
	if (!Node.isJsxExpression(parent)) {
		return false;
	}
	const attribute = parent.getParent();
	if (
		!Node.isJsxAttribute(attribute) ||
		attribute.getNameNode().getText() !== 'options'
	) {
		return false;
	}
	const opening = attribute.getFirstAncestor(
		(ancestor) =>
			Node.isJsxOpeningElement(ancestor) ||
			Node.isJsxSelfClosingElement(ancestor)
	);
	return (
		(Node.isJsxOpeningElement(opening) ||
			Node.isJsxSelfClosingElement(opening)) &&
		isImportedName(opening.getTagNameNode(), PROVIDERS)
	);
};

/** Only migrate mode literals in objects passed to an imported c15t API. */
export const isC15tOptionsObject = (
	object: ObjectLiteralExpression
): boolean => {
	let expression: Node = object;
	while (
		Node.isAsExpression(expression.getParent()) ||
		Node.isSatisfiesExpression(expression.getParent()) ||
		Node.isParenthesizedExpression(expression.getParent())
	) {
		const parent = expression.getParent();
		if (!parent) {
			break;
		}
		expression = parent;
	}
	if (isOptionsUse(expression)) {
		return true;
	}
	const declaration = expression.getParent();
	if (!Node.isVariableDeclaration(declaration)) {
		return false;
	}
	const name = declaration.getNameNode();
	if (!Node.isIdentifier(name)) {
		return false;
	}
	return name.findReferencesAsNodes().some(isOptionsUse);
};
