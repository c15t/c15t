'use client';

import type { PageTree } from 'fumadocs-core/server';
import { TreeContextProvider } from 'fumadocs-ui/contexts/tree';
import { type ReactNode, useMemo } from 'react';
import { FrameworkProvider, useFramework } from './framework-context';

// Extend PageTree.Item type to include our custom properties
export interface SharedPageItem extends PageTree.Item {
	sharedPage?: boolean;
}

interface FrameworkTreeProviderProps {
	tree: PageTree.Root;
	children: ReactNode;
	defaultFramework?: string;
}

/**
 * FrameworkTreeProvider maintains a persistent framework context and filters the tree accordingly
 */
export function FrameworkTreeProvider(props: FrameworkTreeProviderProps) {
	const { tree, children, defaultFramework = 'nextjs' } = props;

	return (
		<FrameworkProvider tree={tree} defaultFramework={defaultFramework}>
			<FrameworkTreeFilter tree={tree}>{children}</FrameworkTreeFilter>
		</FrameworkProvider>
	);
}

/**
 * Filter the page tree based on the active framework
 */
function FrameworkTreeFilter({
	tree,
	children,
}: { tree: PageTree.Root; children: ReactNode }) {
	const { activeFramework } = useFramework();

	// Process the tree to show only content for the active framework
	const enhancedTree = useMemo(() => {
		if (!activeFramework) {
			return tree;
		}

		// Deep clone the tree to avoid mutation
		const newTree = JSON.parse(JSON.stringify(tree)) as PageTree.Root;

		// Find the current framework folder
		const frameworkFolder = newTree.children.find(
			(item) =>
				item.type === 'folder' &&
				item.root === true &&
				typeof item.name === 'string' &&
				item.name.toLowerCase() === activeFramework.toLowerCase()
		) as PageTree.Folder | undefined;

		if (!frameworkFolder) {
			return tree;
		}

		// Filter tree to only show content for the active framework
		// Keep only the active framework from root-level framework folders
		newTree.children = newTree.children.filter((item) => {
			// Always keep the root page
			if (item.type === 'page' && item.url === '/docs') {
				return true;
			}

			// Keep non-framework folders (those without root: true)
			if (item.type === 'folder' && !item.root) {
				return true;
			}

			// Only keep the active framework folder from root-level framework folders
			if (
				item.type === 'folder' &&
				item.root &&
				typeof item.name === 'string'
			) {
				return item.name.toLowerCase() === activeFramework.toLowerCase();
			}

			// Keep other items that aren't framework folders
			return true;
		});

		// ALWAYS restructure to show framework content
		// Get the root landing page if it exists
		const rootPage = newTree.children.find(
			(item) => item.type === 'page' && item.url === '/docs'
		);

		// Create new filtered children array
		const newChildren: PageTree.Node[] = [];

		// Add the root page if it exists
		if (rootPage) {
			newChildren.push(rootPage);
		}

		// Add the framework folder's content directly at the root level
		newChildren.push(...frameworkFolder.children);

		// Replace the tree children with our filtered selection
		newTree.children = newChildren;

		return newTree;
	}, [tree, activeFramework]);

	return (
		<TreeContextProvider tree={enhancedTree} key={`tree-${activeFramework}`}>
			{children}
		</TreeContextProvider>
	);
}
