import type {
	Link,
	List,
	ListItem,
	Paragraph,
	PhrasingContent,
	Root,
	Text,
} from 'mdast';
import type { Transformer } from 'unified';
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';
import {
	extractNodeText,
	getAttributeValue,
	hasName,
	type MdxNode,
	normalizeWhitespace,
} from '../../remark-libs';

/**
 * Types
 */
type CardsToMarkdownOptions = {
	/** When true, append a plain-text description after the link. */
	withDescriptions?: boolean;
};

type LinkItem = {
	href: string;
	text: string;
	description?: string;
};

function createLinkItem(node: MdxNode): LinkItem | null {
	const href = normalizeWhitespace(getAttributeValue(node, 'href') ?? '');
	if (!href) {
		return null;
	}

	const titleAttr = normalizeWhitespace(getAttributeValue(node, 'title') ?? '');
	const text = titleAttr || extractNodeText(node.children);
	if (!text) {
		return null;
	}

	const description =
		normalizeWhitespace(getAttributeValue(node, 'description') ?? '') ||
		undefined;

	return { href, text, description };
}

function collectLinksFromParagraph(paragraph: {
	children?: unknown[];
}): LinkItem[] {
	const results: LinkItem[] = [];
	if (!paragraph.children) {
		return results;
	}

	for (const child of paragraph.children) {
		// Check for Card component with variant="compact"
		if (hasName(child, 'Card')) {
			const variant = getAttributeValue(child, 'variant');
			if (variant === 'compact') {
				const linkItem = createLinkItem(child);
				if (linkItem) {
					results.push(linkItem);
				}
			}
		}
	}
	return results;
}

function collectLinksFromContainer(container: MdxNode): LinkItem[] {
	const results: LinkItem[] = [];

	// Iterate only over immediate children to preserve deterministic ordering
	if (!container.children) {
		return results;
	}

	for (const child of container.children) {
		if (child.type === 'paragraph') {
			results.push(...collectLinksFromParagraph(child));
		} else if (hasName(child, 'Card')) {
			// Check for Card component with variant="compact"
			const variant = getAttributeValue(child, 'variant');
			if (variant === 'compact') {
				const linkItem = createLinkItem(child);
				if (linkItem) {
					results.push(linkItem);
				}
			}
		}
	}

	return results;
}

function toListItem(item: LinkItem, withDescriptions: boolean): ListItem {
	const linkNode: Link = u('link', { url: item.href }, [
		u('text', item.text) as Text,
	]) as Link;

	const phrasing: PhrasingContent[] = [linkNode];
	if (withDescriptions && item.description) {
		phrasing.push(u('text', ` — ${item.description}`) as Text);
	}

	const para: Paragraph = u('paragraph', phrasing) as Paragraph;

	return {
		type: 'listItem',
		spread: false,
		children: [para],
	};
}

export function remarkCardsToMarkdown(
	options: CardsToMarkdownOptions = {}
): Transformer<Root, Root> {
	const { withDescriptions = false } = options;

	return (tree: Root): void => {
		visit(
			tree,
			['mdxJsxFlowElement', 'mdxJsxTextElement'],
			(node, index, parent) => {
				if (typeof index !== 'number' || !parent) {
					return;
				}
				// Only support the new Cards container
				if (!hasName(node, 'Cards')) {
					return;
				}

				const links = collectLinksFromContainer(node);
				if (links.length === 0) {
					parent.children.splice(index, 1);
					return;
				}

				const list: List = {
					type: 'list',
					ordered: false,
					spread: false,
					children: links.map((l) => toListItem(l, withDescriptions)),
				};

				parent.children[index] = list;
			}
		);
	};
}
