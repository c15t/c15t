import type {
	Blockquote,
	Paragraph,
	PhrasingContent,
	Root,
	Strong,
	Text,
} from 'mdast';
import type { Plugin } from 'unified';
import {
	createJsxComponentProcessor,
	createStrong,
	createText,
	extractNodeText,
	getAttributeValue,
	type MdxNode,
	normalizeWhitespace,
} from '../../remark-libs';

type Variant =
	| 'info'
	| 'note'
	| 'tip'
	| 'warning'
	| 'success'
	| 'error'
	| 'canary'
	| 'deprecated'
	| 'experimental';

function variantLabelAndEmoji(raw: string | null): {
	variant: Variant;
	emoji: string;
	label: string;
} {
	const v = (raw ?? 'info').toLowerCase();
	switch (v) {
		case 'warning':
			return { variant: 'warning', emoji: '⚠️', label: 'Warning:' };
		case 'tip':
			return { variant: 'tip', emoji: '💡', label: 'Tip:' };
		case 'success':
			return { variant: 'success', emoji: '✅', label: 'Success:' };
		case 'error':
			return { variant: 'error', emoji: '❌', label: 'Error:' };
		case 'canary':
			return { variant: 'canary', emoji: '🐤', label: 'Canary:' };
		case 'deprecated':
			return { variant: 'deprecated', emoji: '🚫', label: 'Deprecated:' };
		case 'experimental':
			return { variant: 'experimental', emoji: '🧪', label: 'Experimental:' };
		default:
			return { variant: 'info', emoji: 'ℹ️', label: 'Info:' };
	}
}

// Use shared createStrong function from remark-libs

/**
 * Process the content of a callout node, handling JSX elements
 */
function processCalloutContent(node: MdxNode): string {
	let processedContent = '';

	// Process each child node to handle HTML elements
	for (const child of node.children || []) {
		if (
			child.type === 'mdxJsxTextElement' ||
			child.type === 'mdxJsxFlowElement'
		) {
			// Handle JSX elements like <strong>, <code>, etc.
			const tagName = child.name;
			const innerText = extractNodeText(
				(child.children as MdxNode['children']) || []
			);

			switch (tagName) {
				case 'strong':
				case 'b':
					processedContent += `**${innerText}**`;
					break;
				case 'code':
					processedContent += `\`${innerText}\``;
					break;
				case 'em':
				case 'i':
					processedContent += `*${innerText}*`;
					break;
				default:
					processedContent += innerText;
			}
		} else {
			// Handle regular text nodes
			processedContent += extractNodeText([child as PhrasingContent]);
		}
	}

	return normalizeWhitespace(processedContent) || '';
}

export const remarkCalloutToMarkdown: Plugin<[], Root> = () => {
	return createJsxComponentProcessor('Callout', (node) => {
		const variantLabelAndEmojiResult = variantLabelAndEmoji(
			getAttributeValue(node, 'variant') ?? getAttributeValue(node, 'type')
		);
		const { emoji, label } = variantLabelAndEmojiResult;
		const title = (getAttributeValue(node, 'title') ?? '').trim() || null;
		const clean = processCalloutContent(node);

		// Create single paragraph with inline content (like steps component)
		const paragraphChildren: Array<Text | Strong> = [];

		// Add emoji and label
		if (emoji) {
			paragraphChildren.push(createText(`${emoji} `));
		}
		paragraphChildren.push(createStrong(label));

		// Add title if present
		if (title) {
			paragraphChildren.push(createText(' '));
			paragraphChildren.push(createStrong(title));
		}

		// Add content inline if present
		if (clean) {
			paragraphChildren.push(createText(`\n${clean}`));
		}

		const paragraph: Paragraph = {
			type: 'paragraph',
			children: paragraphChildren,
		};

		const blockquote: Blockquote = {
			type: 'blockquote',
			children: [paragraph],
		};

		return [blockquote];
	});
};
