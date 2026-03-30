import type { Parent, Root, RootContent } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';
import { hasName } from './guards';
import type { MdxNode } from './types';

/**
 * Function signature for processing a JSX component node
 */
type ComponentProcessor = (
	node: MdxNode,
	index: number,
	parent: Parent
) => RootContent[] | undefined;

/**
 * Generic processor for MDX JSX components that handles the common pattern:
 * - Visit MDX JSX elements
 * - Filter by component name(s)
 * - Process and replace content
 * - Handle empty content removal
 *
 * @param componentName - The name of the JSX component to process, or array of names
 * @param processor - Function that processes the node and returns replacement content
 * @param removeIfEmpty - If true, removes the node entirely if processor returns empty array
 * @returns A unified transformer function
 */
export function createJsxComponentProcessor(
	componentName: string | string[],
	processor: ComponentProcessor,
	removeIfEmpty = true
): (tree: Root) => Root {
	const names = Array.isArray(componentName) ? componentName : [componentName];

	return (tree: Root): Root => {
		visit(
			tree,
			['mdxJsxFlowElement', 'mdxJsxTextElement'],
			(node, index, parent) => {
				if (!parent || typeof index !== 'number') {
					return;
				}

				const isValidComponent = names.some((name) => hasName(node, name));
				if (!isValidComponent) {
					return;
				}

				const result = processor(node as MdxNode, index, parent);

				// If processor returns void, assume it handled replacement internally
				if (result === undefined) {
					return SKIP;
				}

				// Handle empty content
				if (result.length === 0) {
					if (removeIfEmpty) {
						parent.children.splice(index, 1);
						return SKIP;
					}
					// If not removing empty, just continue without SKIP to leave node as-is
					return;
				}

				// Replace the node with processed content
				parent.children.splice(index, 1, ...result);
				return SKIP;
			}
		);
		return tree;
	};
}

/**
 * Simplified processor for components that return a single replacement node
 */
export function createSimpleJsxComponentProcessor(
	componentName: string,
	processor: (
		node: MdxNode,
		index: number,
		parent: Parent
	) => RootContent | null,
	removeIfEmpty = true
) {
	return createJsxComponentProcessor(
		componentName,
		(node, index, parent) => {
			const result = processor(node, index, parent);
			return result ? [result] : [];
		},
		removeIfEmpty
	);
}
