/** @biome-ignore lint/complexity/noExcessiveCognitiveComplexity:  this is okay */
import type { Blockquote, Node, Paragraph, Table } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import { u } from 'unist-builder';
import { is } from 'unist-util-is';
import {
	extractBlockquoteContent,
	extractParagraphContent,
	normalizeWhitespace,
	processContentText,
} from './text';

/**
 * Process a single content node and return appropriate AST node
 * Shared utility for processing content nodes across different plugins
 * Handles paragraphs, tables, blockquotes, code blocks, text nodes, and other content types
 */
export function processContentNode(
	node: Node
): Paragraph | Table | Blockquote | Node | null {
	if (is(node, 'paragraph')) {
		const content = extractParagraphContent(node as Paragraph);
		if (content.length > 0) {
			return {
				type: 'paragraph',
				children: [{ type: 'text', value: content[0] }],
			} as Paragraph;
		}
		return null;
	}
	if (is(node, 'table')) {
		// Return the table node as-is instead of extracting text content
		// This preserves the full table structure including all rows
		return node as Table;
	}
	if (is(node, 'blockquote')) {
		const content = extractBlockquoteContent(node as Blockquote);
		if (content.length > 0) {
			return processContentText(content[0]);
		}
		return null;
	}
	if (node.type === 'code') {
		// Handle code blocks directly as AST nodes
		const codeNode = node as { lang?: string; value?: string };
		return u(
			'code',
			{ lang: codeNode.lang || '' },
			codeNode.value || ''
		) as Node;
	}
	if (node.type === 'text') {
		// Skip whitespace-only text nodes
		const textNode = node as unknown as { value: string };
		if (textNode.value.trim()) {
			const normalizedText = normalizeWhitespace(textNode.value, true);
			return {
				type: 'paragraph',
				children: [{ type: 'text', value: normalizedText }],
			} as Paragraph;
		}
		return null;
	}
	// Handle any other node type by extracting text content
	const nodeText = mdastToString(node);
	if (nodeText.trim()) {
		const cleanedText = normalizeWhitespace(nodeText, true);
		return processContentText(cleanedText);
	}

	return null;
}

/**
 * Process an array of content nodes and add them to a replacement array
 * Useful for plugins that need to process multiple nodes at once
 */
export function processContentNodes(nodes: Node[], replacement: Node[]): void {
	for (const node of nodes) {
		const processedNode = processContentNode(node);

		if (processedNode) {
			replacement.push(processedNode);
		}
	}
}
