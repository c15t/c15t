import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

/**
 * Common type for MDX JSX elements (both flow and text)
 */
export type MdxNode = MdxJsxFlowElement | MdxJsxTextElement;

/**
 * Common type for MDX JSX attributes
 */
export type {
	MdxJsxAttribute,
	MdxJsxAttributeValueExpression,
} from 'mdast-util-mdx-jsx';
