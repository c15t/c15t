import JSON5 from 'json5';
import { isAttrValueExpression } from './guards';
import type { MdxJsxAttribute, MdxNode } from './types';

/**
 * Get the value of an MDX JSX attribute
 */
export function getAttributeValue<T extends MdxNode>(
	node: T,
	key: string
): string | null {
	const attrs = (node.attributes ?? []) as readonly MdxJsxAttribute[];
	const attr = attrs.find(
		(a) => a.type === 'mdxJsxAttribute' && a.name === key
	);

	if (!attr) {
		return null;
	}

	const v = attr.value;
	if (typeof v === 'string') {
		return v;
	}
	if (v === null) {
		return 'true';
	}
	if (isAttrValueExpression(v)) {
		return String(v.value);
	}
	return null;
}

/**
 * Parse a JS-like array literal from an MDX attribute value expression.
 *
 * Accepts flexible array syntax including:
 * - Single/double quotes: ['item1', "item2"]
 * - Unquoted object keys: [item1, item2]
 * - Trailing commas: ['item1', 'item2',]
 * - Comments: ['item1', // comment]
 * - Mixed quotes: ["item1", 'item2']
 *
 * Falls back to null if:
 * - Input is empty or null
 * - Input is not bracketed
 * - Parsed result is not an array
 * - Array contains non-string elements
 * - JSON5 parsing fails
 *
 * @param raw - The raw attribute value to parse
 * @returns Array of strings or null if parsing fails
 */
export function parseItemsArray(raw: string | null): string[] | null {
	if (!raw) {
		return null;
	}
	const trimmed = raw.trim();
	// Require bracketed array syntax
	if (!(trimmed.startsWith('[') && trimmed.endsWith(']'))) {
		return null;
	}
	try {
		const parsed = JSON5.parse(trimmed);
		return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')
			? parsed
			: null;
	} catch {
		return null;
	}
}
