import type {
	BlockContent,
	DefinitionContent,
	Heading,
	List,
	ListItem,
	Paragraph,
	PhrasingContent,
	RootContent,
	Strong,
	Table,
	TableCell,
	TableRow,
	Text,
} from 'mdast';

/**
 * Create a text node
 */
export function createText(text: string): Text {
	return { type: 'text', value: text };
}

/**
 * Create a strong (bold) text node
 */
export function createStrong(text: string): Strong {
	return { type: 'strong', children: [createText(text)] };
}

/**
 * Create an inline code node
 */
export function createInlineCode(value: string): PhrasingContent {
	return { type: 'inlineCode', value };
}

/**
 * Create a paragraph node
 */
export function createParagraph(text: string): Paragraph {
	return { type: 'paragraph', children: [createText(text)] };
}

/**
 * Create a paragraph with strong emphasis
 */
export function createStrongParagraph(text: string): Paragraph {
	return {
		type: 'paragraph',
		children: [createStrong(text)],
	};
}

/**
 * Create a heading node
 */
export function createHeading(
	depth: 1 | 2 | 3 | 4 | 5 | 6,
	text: string
): Heading {
	return {
		type: 'heading',
		depth,
		children: [createText(text)],
	};
}

/**
 * Create a table cell node
 */
export function createTableCell(
	content: string | PhrasingContent[]
): TableCell {
	const children =
		typeof content === 'string' ? [createText(content)] : content;

	return {
		type: 'tableCell',
		children,
	};
}

/**
 * Create a table row node
 */
export function createTableRow(
	cells: (string | PhrasingContent[])[]
): TableRow {
	return {
		type: 'tableRow',
		children: cells.map(createTableCell),
	};
}

/**
 * Create a table with specified headers and rows
 */
export function createTable(
	headers: string[],
	rows: (string | PhrasingContent[])[][],
	align?: ('left' | 'center' | 'right' | null)[]
): Table {
	const headerRow = createTableRow(headers);
	const dataRows = rows.map(createTableRow);

	return {
		type: 'table',
		align: align ?? headers.map(() => 'left'),
		children: [headerRow, ...dataRows],
	};
}

/**
 * Create a list item node
 */
export function createListItem(children: RootContent[]): ListItem {
	return {
		type: 'listItem',
		children: children as (BlockContent | DefinitionContent)[],
	};
}

/**
 * Create an ordered list node
 */
export function createOrderedList(
	items: ListItem[],
	start = 1,
	spread = true
): List {
	return {
		type: 'list',
		ordered: true,
		start,
		spread,
		children: items,
	};
}

/**
 * Create an unordered list node
 */
export function createUnorderedList(items: ListItem[], spread = true): List {
	return {
		type: 'list',
		ordered: false,
		spread,
		children: items,
	};
}
