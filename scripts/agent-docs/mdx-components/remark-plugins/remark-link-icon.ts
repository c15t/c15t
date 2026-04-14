import type { Link, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';

// Regex patterns for URL cleaning (defined at top level for performance)
const PROTOCOL_REGEX = /^https?:\/\//;
const WWW_REGEX = /^www\./;

/**
 * Strip protocol and www. from URL for display
 */
function cleanUrlForDisplay(url: string): string {
	return url.replace(PROTOCOL_REGEX, '').replace(WWW_REGEX, '');
}

/**
 * Check if a URL is external (http/https or protocol-relative)
 */
function isExternalUrl(url: string): boolean {
	return (
		url.startsWith('http://') ||
		url.startsWith('https://') ||
		url.startsWith('//')
	);
}

/**
 * Check if link already has an icon component
 */
function hasIcon(child: unknown): child is { type: string; name: string } {
	return (
		!!child &&
		typeof child === 'object' &&
		'type' in child &&
		child.type === 'mdxJsxTextElement' &&
		'name' in child &&
		child.name === 'Icon'
	);
}

/**
 * Clean up link text by removing protocol and www. prefixes
 */
function cleanLinkText(node: Link, url: string): void {
	if (!node.children || node.children.length === 0) {
		return;
	}

	const cleanedUrl = cleanUrlForDisplay(url);
	const urlWithoutProtocol = url.replace(PROTOCOL_REGEX, '');
	const urlWithoutProtocolAndWww = urlWithoutProtocol.replace(WWW_REGEX, '');

	for (const child of node.children) {
		if (
			child &&
			typeof child === 'object' &&
			'type' in child &&
			child.type === 'text'
		) {
			const textValue = child.value;
			if (
				textValue === url ||
				textValue === urlWithoutProtocol ||
				textValue === urlWithoutProtocolAndWww
			) {
				child.value = cleanedUrl;
			}
		}
	}
}

/**
 * Remark plugin to add an icon to external links
 * Adds an external link icon (external-link) to markdown links that are external
 * Also cleans up link text by removing https://, http://, and www. prefixes
 */
export function remarkLinkIcon(): Transformer<Root, Root> {
	return (tree) => {
		visit(tree, 'link', (node: Link) => {
			const url = node.url;

			if (!isExternalUrl(url)) {
				return;
			}

			// Clean up link text: strip https://, http://, and www. from text nodes
			cleanLinkText(node, url);

			// Skip if link already has an icon
			const lastChild = node.children?.[node.children.length - 1];
			if (hasIcon(lastChild)) {
				return;
			}

			// Create Icon component as MDX JSX element
			const iconElement = {
				type: 'mdxJsxTextElement' as const,
				name: 'Icon',
				attributes: [
					{
						type: 'mdxJsxAttribute' as const,
						name: 'name',
						value: 'external-link',
					},
					{
						type: 'mdxJsxAttribute' as const,
						name: 'width',
						value: '16',
					},
					{
						type: 'mdxJsxAttribute' as const,
						name: 'height',
						value: '16',
					},
					{
						type: 'mdxJsxAttribute' as const,
						name: 'className',
						value: 'inline-block align-text-bottom',
					},
					{
						type: 'mdxJsxAttribute' as const,
						name: 'aria-hidden',
						value: 'true',
					},
				],
				children: [],
			};

			// Add icon to link children
			if (node.children) {
				node.children.push(iconElement);
			} else {
				node.children = [iconElement];
			}
		});
	};
}
