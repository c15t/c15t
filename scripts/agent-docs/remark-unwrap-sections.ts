import type { RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import { visit } from 'unist-util-visit';

function isSectionNode(node: unknown): node is MdxJsxFlowElement {
	return (
		typeof node === 'object' &&
		node !== null &&
		'type' in node &&
		node.type === 'mdxJsxFlowElement' &&
		'name' in node &&
		node.name === 'section' &&
		'children' in node &&
		Array.isArray(node.children)
	);
}

export function remarkUnwrapSections() {
	return (tree: RootContent | { children?: RootContent[] }) => {
		visit(tree, (node, index, parent) => {
			if (
				typeof index !== 'number' ||
				!parent ||
				!('children' in parent) ||
				!Array.isArray(parent.children) ||
				!isSectionNode(node)
			) {
				return;
			}

			parent.children.splice(index, 1, ...(node.children as RootContent[]));
			return index;
		});
	};
}
