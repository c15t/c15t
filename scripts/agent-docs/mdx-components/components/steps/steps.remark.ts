import { decodeNamedCharacterReference } from 'decode-named-character-reference';
import type { Blockquote, ListItem, Node, Paragraph, Root, Table } from 'mdast';
import { compact } from 'mdast-util-compact';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import { is } from 'unist-util-is';
import {
	createJsxComponentProcessor,
	createOrderedList,
	createStrongParagraph,
	getAttributeValue,
	hasName,
	type MdxNode,
	normalizeWhitespace,
	processContentNode,
} from '../../remark-libs';

/**
 * Decode HTML entities in text (both named and numeric character references)
 */
function decodeText(text: string): string {
	const HEX_PREFIX_LENGTH = 2; // Length of "#x" prefix
	const DECIMAL_PREFIX_LENGTH = 1; // Length of "#" prefix
	const HEX_RADIX = 16;
	const DECIMAL_RADIX = 10;
	const UNICODE_MAX_CODE_POINT = 0x10_ff_ff; // Maximum valid Unicode code point
	const SURROGATE_MIN = 0xd8_00; // Start of Unicode surrogate range
	const SURROGATE_MAX = 0xdf_ff; // End of Unicode surrogate range

	const decodedText = text.replace(
		/&(#x?[0-9A-Fa-f]+|[a-zA-Z][a-zA-Z0-9]+);/g,
		(_m: string, ent: string): string => {
			// Numeric: &#123; or &#x1F4A9;
			if (ent[0] === '#') {
				const isHex = ent[1]?.toLowerCase() === 'x';
				const num = Number.parseInt(
					ent.slice(isHex ? HEX_PREFIX_LENGTH : DECIMAL_PREFIX_LENGTH),
					isHex ? HEX_RADIX : DECIMAL_RADIX
				);
				const isInteger = Number.isInteger(num);
				const inUnicodeRange =
					isInteger &&
					num >= 0 &&
					num <= UNICODE_MAX_CODE_POINT &&
					!(num >= SURROGATE_MIN && num <= SURROGATE_MAX); // exclude surrogate range
				return inUnicodeRange ? String.fromCodePoint(num) : `&${ent};`;
			}
			// Named
			const decoded = decodeNamedCharacterReference(`&${ent};`);
			return decoded === false ? `&${ent};` : decoded;
		}
	);
	return normalizeWhitespace(decodedText);
}

// Use shared createStrongParagraph function from remark-libs

/**
 * Type guard for Step JSX element
 */
function isStepNode(node: unknown): node is MdxNode {
	if (typeof node !== 'object' || node === null) {
		return false;
	}

	const isJsxElement =
		is(node, 'mdxJsxFlowElement') || is(node, 'mdxJsxTextElement');
	if (!isJsxElement) {
		return false;
	}

	return hasName(node, 'Step');
}

/**
 * Extract title from a Step node, preferring title attribute over content
 */
function extractStepTitle(
	step: MdxNode
): { title: string; titleNode: Node | null } | null {
	// Prefer explicit title attribute; fall back to first heading/paragraph/text
	const attrTitleRaw = (getAttributeValue(step, 'title') ?? '').trim();

	if (attrTitleRaw) {
		const title = decodeText(attrTitleRaw);
		return title ? { title, titleNode: null } : null;
	}

	const children = (step.children ?? []) as unknown[] as Node[];
	const titleNode =
		children.find((c) => is(c, 'heading') || is(c, 'paragraph')) ??
		children.find((c) => c.type === 'text' || c.type === 'mdxTextExpression') ??
		null;
	if (!titleNode) {
		return null;
	}
	const title = decodeText(mdastToString(titleNode));
	return title ? { title, titleNode } : null;
}

/**
 * Get content nodes that come after the title node
 */
function getContentNodes(step: MdxNode, titleNode: Node | null): Node[] {
	const children = (step.children ?? []) as unknown[] as Node[];
	let startIdx = -1;
	if (titleNode) {
		startIdx = children.indexOf(titleNode);
	}
	return startIdx >= 0 ? children.slice(startIdx + 1) : children;
}

// Helper function to process content nodes and build list item children
function processContentNodesForListItem(
	contentNodes: Node[],
	titleParagraph: Paragraph,
	listItemChildren: (Paragraph | Table | Blockquote | Node)[]
): void {
	if (contentNodes.length === 0) {
		return;
	}

	// Special handling for table nodes - keep them as separate elements
	const firstContentNode = contentNodes[0];
	let startIndex = 1; // Default starting index for the remaining nodes loop

	if (firstContentNode.type === 'table') {
		// For tables, keep them as separate elements (don't inline with title)
		listItemChildren.push(firstContentNode);
	} else if (firstContentNode.type === 'paragraph') {
		// For paragraphs, inline the text content into the title
		const firstContentText = mdastToString(firstContentNode);
		if (firstContentText.trim()) {
			const normalizedContent = normalizeWhitespace(firstContentText.trim());
			const contentTextNode = {
				type: 'text',
				value: ` ${normalizedContent}`,
			} as const;
			titleParagraph.children.push(contentTextNode);
		}
		// Start processing remaining nodes from index 1
		startIndex = 1;
	} else {
		// For other block-level content (blockquote, code, list, etc.),
		// process as separate element and start remaining loop from index 1
		const processedFirstNode = processContentNode(firstContentNode);
		if (processedFirstNode) {
			listItemChildren.push(processedFirstNode);
		}
		// Start processing remaining nodes from index 1
		startIndex = 1;
	}

	// Add remaining content nodes as separate elements
	for (let i = startIndex; i < contentNodes.length; i++) {
		const contentNode = processContentNode(contentNodes[i]);
		if (contentNode) {
			listItemChildren.push(contentNode);
		}
	}
}

/**
 * Convert a Step node to a list item
 */
function stepToListItem(step: MdxNode): ListItem | null {
	const titleResult = extractStepTitle(step);
	if (!titleResult) {
		return null;
	}

	const { title, titleNode } = titleResult;
	const contentNodes = getContentNodes(step, titleNode);

	// Handle special case: if first paragraph was used as title and there are no following siblings
	if (contentNodes.length === 0 && titleNode && is(titleNode, 'paragraph')) {
		return {
			type: 'listItem',
			children: [createStrongParagraph(title)],
		} as ListItem;
	}

	// Create the title paragraph
	const titleParagraph: Paragraph = {
		type: 'paragraph',
		children: [{ type: 'strong', children: [{ type: 'text', value: title }] }],
	};

	// If no additional content, just return the title
	if (contentNodes.length === 0) {
		return {
			type: 'listItem',
			children: [titleParagraph],
		} as ListItem;
	}

	// Create list item children array
	const listItemChildren: (Paragraph | Table | Blockquote | Node)[] = [
		titleParagraph,
	];

	// Process content nodes
	processContentNodesForListItem(
		contentNodes,
		titleParagraph,
		listItemChildren
	);

	return {
		type: 'listItem',
		children: listItemChildren,
	} as ListItem;
}

/**
 * Process Steps node children to extract list items
 */
function processStepsNode(node: MdxNode): ListItem[] {
	const listItems: ListItem[] = [];

	if (node.children) {
		for (const child of node.children) {
			if (isStepNode(child)) {
				const listItem = stepToListItem(child);
				if (listItem) {
					listItems.push(listItem);
				}
			}
		}
	}

	return listItems;
}

/**
 * Remark plugin to convert Steps JSX elements to numbered markdown lists
 */
export const remarkStepsToMarkdown: Plugin<[], Root> = () => {
	return (tree) => {
		const processor = createJsxComponentProcessor('Steps', (node) => {
			const items = processStepsNode(node);

			if (items.length === 0) {
				return [];
			}

			// Create ordered list - always spread for better readability
			const list = createOrderedList(items, 1, true);
			return [list];
		});

		processor(tree);

		// Clean up whitespace and empty paragraphs
		compact(tree);
		return tree;
	};
};
