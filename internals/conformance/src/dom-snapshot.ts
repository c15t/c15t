/**
 * Framework-agnostic DOM snapshot.
 *
 * Normalizes an Element's outerHTML by stripping:
 * - Svelte scoped class hashes (`svelte-[a-z0-9]+`, `s-[a-z0-9]+`)
 * - React-internal attributes (`data-reactroot`, legacy `reactid`)
 * - Auto-generated IDs from portalized UI libs (Radix/Ark `:r…:`, `radix-…`)
 * - Extra whitespace between tags
 * - Attribute ordering (alphabetized)
 *
 * The result is a canonical string suitable for equality checks between
 * frameworks.
 */

const SVELTE_SCOPED_CLASS = /\bsvelte-[a-z0-9]+\b/g;
const S_SCOPED_CLASS = /\bs-[a-z0-9]{6,}\b/g;
const AUTO_ID_VALUE = /^(?::r[0-9a-z]+:|radix-[a-z0-9-]+|ark-[a-z0-9-]+)$/;

const STRIP_ATTRS = new Set([
	'data-reactroot',
	'data-reactid',
	'data-svelte-h',
]);

function stripClasses(classValue: string): string {
	return classValue
		.replace(SVELTE_SCOPED_CLASS, '')
		.replace(S_SCOPED_CLASS, '')
		.split(/\s+/)
		.filter(Boolean)
		.sort()
		.join(' ');
}

function normalizeAttrValue(name: string, value: string): string {
	if (
		(name === 'id' ||
			name === 'aria-labelledby' ||
			name === 'aria-describedby' ||
			name === 'aria-controls' ||
			name === 'for') &&
		AUTO_ID_VALUE.test(value)
	) {
		return '__AUTO__';
	}
	if (name === 'class') return stripClasses(value);
	return value;
}

/**
 * Recursively serialize an element to a canonical HTML-like string.
 * Sorts attributes alphabetically, normalizes class and auto-ids.
 */
function canonicalize(el: Element): string {
	const tag = el.tagName.toLowerCase();
	const attrs: string[] = [];

	for (const a of Array.from(el.attributes)) {
		if (STRIP_ATTRS.has(a.name)) continue;
		const normalized = normalizeAttrValue(a.name, a.value);
		if (a.name === 'class' && normalized === '') continue;
		attrs.push(`${a.name}="${normalized}"`);
	}
	attrs.sort();

	const open = `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;

	const children: string[] = [];
	for (const node of Array.from(el.childNodes)) {
		if (node.nodeType === 1) {
			children.push(canonicalize(node as Element));
			continue;
		}
		if (node.nodeType === 3) {
			const text = node.textContent ?? '';
			const trimmed = text.replace(/\s+/g, ' ').trim();
			if (trimmed) children.push(trimmed);
			continue;
		}
		// other node types (comments, etc.) are ignored
	}

	const close = `</${tag}>`;
	return `${open}${children.join('')}${close}`;
}

export function domSnapshot(el: Element): string {
	return canonicalize(el);
}

/**
 * Snapshot only the elements matching any of `testIds`, preserving nesting.
 * Used when we want to compare just the "stable" parts of a component
 * ignoring portal positioning or unrelated sibling noise.
 */
export function domSnapshotFor(
	root: ParentNode,
	testIds: readonly string[]
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const id of testIds) {
		const el = root.querySelector(`[data-testid="${id}"]`);
		if (el) out[id] = domSnapshot(el);
	}
	return out;
}
