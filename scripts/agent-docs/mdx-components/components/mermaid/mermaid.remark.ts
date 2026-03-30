import type { Code, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import {
	extractNodeText,
	getAttributeValue,
	hasName,
	type MdxNode,
} from '../../remark-libs';

// Precompiled regexes
const ESCAPED_NL = /\\n/g; // "\\n" -> actual newline
const CRLF = /\r\n/g; // CRLF -> LF
const LEADING_BACKTICK_LINE = /^`\s*\n/; // a lone backtick then newline
const TRAILING_BACKTICK_LINE = /\n\s*`$/; // newline then a lone backtick
const TRAILING_WHITESPACE = /[ \t]+$/; // trailing spaces/tabs on a line
const LEADING_BLANK_LINES = /^\s*\n+/; // one or more blank lines at start
const TRAILING_BLANK_LINES = /\n+\s*$/; // one or more blank lines at end
const HTML_BREAK = /<br\s*\/?>/gi;

function cleanMermaidSource(raw: string): string {
	// Step 1: Normalize CRLF to LF
	let s = raw.replace(CRLF, '\n');

	// Step 2: Convert escaped newlines
	s = s.replace(ESCAPED_NL, '\n');

	// Step 2.5: Convert HTML line breaks to plain text separators for readability
	s = s.replace(HTML_BREAK, ' / ');

	// Step 3: Strip only outer blank lines (not leading spaces)
	s = s.replace(LEADING_BLANK_LINES, '').replace(TRAILING_BLANK_LINES, '');

	// Step 4: Remove leading/trailing backtick guard lines
	s = s.replace(LEADING_BACKTICK_LINE, '').replace(TRAILING_BACKTICK_LINE, '');

	// Step 5: Split into lines, trim only trailing whitespace from each line, rejoin
	// (preserving leading indentation)
	s = s
		.split('\n')
		.map((line) => line.replace(TRAILING_WHITESPACE, ''))
		.join('\n');

	return s;
}

function toMermaidCode(value: string): Code {
	return { type: 'code', lang: 'mermaid', value };
}

function extractMermaidContent(node: MdxNode): string {
	const chartAttr = getAttributeValue(node, 'chart');
	const fromChildren = extractNodeText(node.children || []);
	const src =
		chartAttr && chartAttr.trim().length > 0 ? chartAttr : fromChildren;
	return src ? cleanMermaidSource(src) : '';
}

export function remarkMermaidToMarkdown(): Transformer<Root, Root> {
	return (tree) => {
		visit(
			tree,
			['mdxJsxFlowElement', 'mdxJsxTextElement'],
			(node, index, parent) => {
				if (!parent || typeof index !== 'number' || !hasName(node, 'Mermaid')) {
					return;
				}

				const value = extractMermaidContent(node);

				// Remove empty Mermaid nodes completely
				if (!value) {
					parent.children.splice(index, 1);
					return index;
				}

				const code = toMermaidCode(value);
				parent.children[index] = code;
			}
		);
	};
}
