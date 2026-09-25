/**
 * Compares server-rendered and browser-built banner markup.
 */

export type Tree = [string, Record<string, string>, (Tree | string)[]];

/**
 * Tag, attributes and text, ignoring whitespace, visibility state and the
 * source annotations Astro adds in development.
 */
export const describeTree = function describeTree(element: Element): Tree {
	const attributes: Record<string, string> = {};
	for (const { name, value } of element.attributes) {
		if (
			name === 'hidden' ||
			name === 'data-c15t-visible' ||
			name.startsWith('data-astro-source')
		) {
			continue;
		}
		if (name === 'class' && value === '') {
			continue;
		}
		attributes[name] = value;
	}
	const children: (Tree | string)[] = [];
	for (const node of element.childNodes) {
		if (node.nodeType === node.ELEMENT_NODE) {
			children.push(describeTree(node as Element));
		} else if (node.nodeType === node.TEXT_NODE) {
			const text = node.textContent?.replace(/\s+/gu, ' ').trim();
			if (text) {
				children.push(text);
			}
		}
	}
	return [element.tagName.toLowerCase(), attributes, children];
};
