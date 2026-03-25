import type {
	Blockquote,
	Paragraph,
	Root,
	RootContent,
	Table,
	TableCell,
	TableRow,
} from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { MdxNode } from './types';

// Common regex patterns
const MULTI_WHITESPACE = /\s+/g;
const TRIM_WHITESPACE = /^\s+|\s+$/g;
const HORIZONTAL_WHITESPACE = /[ \t]+/g;
const BOLD_HEADER = /^\s*\*\*(.+?)\*\*\s*$/s;
const BLOCKQUOTE_LINE = /^>\s?/;
/**
 * Normalize whitespace in a string
 * @param text - The text to normalize
 * @param preserveNewlines - If true, preserves newlines while cleaning horizontal whitespace
 */
export function normalizeWhitespace(
	text: string,
	preserveNewlines = false
): string {
	const pattern = preserveNewlines ? HORIZONTAL_WHITESPACE : MULTI_WHITESPACE;

	const normalized = text.replace(pattern, ' ');

	return preserveNewlines
		? normalized.replace(TRIM_WHITESPACE, '').trim()
		: normalized.trim();
}

/**
 * Extract text content from MDX node children
 */
export function extractNodeText(children: MdxNode['children']): string {
	const root: Root = {
		type: 'root',
		children: (children as unknown as RootContent[]) ?? [],
	};
	return mdastToString(root);
}

// cleanText function removed - consolidated into normalizeWhitespace with preserveNewlines=true

/**
 * Extract and normalize text from MDX node children
 */
export function extractAndCleanNodeText(children: MdxNode['children']): string {
	return normalizeWhitespace(extractNodeText(children), true);
}

/**
 * Extract text content from a paragraph node
 */
export function extractParagraphContent(node: Paragraph): string[] {
	const rawText = extractNodeText(node.children);
	if (!rawText.trim()) {
		return [];
	}
	const cleanedText = normalizeWhitespace(rawText, true);
	return [cleanedText];
}

/**
 * Extract markdown content from a table node
 */
export function extractTableContent(node: Table): string[] {
	const tableRows = node.children || [];
	if (tableRows.length === 0) {
		return [];
	}

	// Get first row (header) and convert to markdown
	const headerRow = tableRows[0] as TableRow;
	const headerCells = headerRow.children || [];
	const headerText = headerCells
		.map((cell: TableCell) => {
			const cellText = extractNodeText(cell.children || []);
			return cellText.trim();
		})
		.join('|');

	// Get second row (first data row) and convert to markdown
	const dataRow = tableRows[1] as TableRow;
	if (!dataRow) {
		return [];
	}

	const dataCells = dataRow.children || [];
	const dataText = dataCells
		.map((cell: TableCell) => {
			const cellText = extractNodeText(cell.children || []);
			return cellText.trim();
		})
		.join('|');

	return [`${headerText}\n${dataText}`];
}

/**
 * Extract markdown content from a blockquote node
 */
export function extractBlockquoteContent(node: Blockquote): string[] {
	const blockquoteText = extractNodeText(node.children || []);
	if (!blockquoteText.trim()) {
		return [];
	}
	return [`> ${blockquoteText.trim()}`];
}

/**
 * Create a blockquote from content text
 */
export function createBlockquoteFromContent(
	contentText: string
): Blockquote | null {
	if (!contentText.startsWith('> ')) {
		return null;
	}

	const lines = contentText.split('\n');
	const paragraphs = lines
		.filter((line) => line.trim()) // Remove empty lines
		.map((line) => {
			// Remove leading > and optional space
			const cleanLine = line.replace(BLOCKQUOTE_LINE, '');
			return {
				type: 'paragraph',
				children: [{ type: 'text', value: cleanLine }],
			};
		});

	return {
		type: 'blockquote',
		children: paragraphs,
	} as Blockquote;
}
/**
 * Process content text and return appropriate AST node
 */
export function processContentText(
	contentText: string
): Paragraph | Table | Blockquote | null {
	// Try to create a table first
	const table = createTableFromContent(contentText);
	if (table) {
		return table;
	}

	// Try to create a blockquote
	const blockquote = createBlockquoteFromContent(contentText);
	if (blockquote) {
		return blockquote;
	}

	// Check for bold headers with regex to handle whitespace and inner asterisks
	const boldHeaderMatch = contentText.match(BOLD_HEADER);
	if (boldHeaderMatch) {
		const headerText = boldHeaderMatch[1].trim();
		return {
			type: 'paragraph',
			children: [
				{ type: 'strong', children: [{ type: 'text', value: headerText }] },
			],
		} as Paragraph;
	}

	// Skip empty content
	if (contentText.trim() === '') {
		return null;
	}

	// Regular paragraph content
	return {
		type: 'paragraph',
		children: [{ type: 'text', value: contentText }],
	} as Paragraph;
}

/**
 * Create a table from content text
 */
export function createTableFromContent(contentText: string): Table | null {
	if (!(contentText.includes('|') && contentText.includes('\n'))) {
		return null;
	}

	const lines = contentText.split('\n');
	if (lines.length < 2) {
		return null;
	}

	const headers = lines[0].split('|').map((h) => h.trim());
	const data = lines[1].split('|').map((d) => d.trim());

	return {
		type: 'table',
		children: [
			{
				type: 'tableRow',
				children: headers.map((header) => ({
					type: 'tableCell',
					children: [{ type: 'text', value: header }],
				})),
			},
			{
				type: 'tableRow',
				children: data.map((cell) => ({
					type: 'tableCell',
					children: [{ type: 'text', value: cell }],
				})),
			},
		],
	} as Table;
}
