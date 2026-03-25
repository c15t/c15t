import type { MdxJsxAttributeValueExpression, MdxNode } from './types';

/**
 * Type guard to check if a node is an MDX JSX element
 */
export function isMdxNode(node: unknown): node is MdxNode {
	if (typeof node !== 'object' || node === null) {
		return false;
	}
	const t = (node as { type?: unknown }).type;
	return t === 'mdxJsxFlowElement' || t === 'mdxJsxTextElement';
}

/**
 * Type guard to check if a node is an MDX JSX element with a specific name
 */
export function hasName<T extends string>(
	node: unknown,
	name: T
): node is MdxNode & { name: T } {
	return isMdxNode(node) && (node as MdxNode).name === name;
}

/**
 * Type guard to check if a value is an MDX JSX attribute value expression
 */
export function isAttrValueExpression(
	v: unknown
): v is MdxJsxAttributeValueExpression {
	return Boolean(
		v &&
			typeof v === 'object' &&
			(v as { type?: unknown }).type === 'mdxJsxAttributeValueExpression'
	);
}
