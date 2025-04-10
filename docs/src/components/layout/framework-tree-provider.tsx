'use client';

import { usePathname } from 'fumadocs-core/framework';
import type { PageTree } from 'fumadocs-core/server';
import { TreeContextProvider } from 'fumadocs-ui/contexts/tree';
import { type ReactNode, useMemo } from 'react';

// Extend PageTree.Item type to include our custom properties
export interface SharedPageItem extends PageTree.Item {
	sharedPage?: boolean;
	frameworkUrl?: string;
}

// Patterns for identifying shared component pages
const SHARED_PATTERNS = [
	{ pattern: '/components/react/', section: 'React' as const },
	{ pattern: '/hooks/', section: 'Hooks' as const },
];

// Valid section names to use as keys
type SectionName = 'React' | 'Hooks';

interface FrameworkTreeProviderProps {
	tree: PageTree.Root;
	children: ReactNode;
	defaultFramework?: string;
}

/**
 * Wraps TreeContextProvider with framework-aware sharing of common components
 * across frameworks while maintaining the current framework context
 */
export function FrameworkTreeProvider({
	tree,
	children,
	defaultFramework = '',
}: FrameworkTreeProviderProps) {
	const pathname = usePathname();
	// Use defaultFramework if provided, otherwise extract from pathname
	const pathFramework = pathname.split('/')[2] || '';
	const currentFramework = pathFramework || defaultFramework;

	// Process the tree with framework-specific enhancements
	const enhancedTree = useMemo(() => {
		if (!currentFramework) {
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
				item.name.toLowerCase() === currentFramework.toLowerCase()
		) as PageTree.Folder | undefined;

		if (!frameworkFolder) {
			return tree;
		}

		// For the root page with default framework, restructure the tree
		// to make the framework folder items appear at the root level
		if ((pathname === '/docs' || pathname === '/docs/') && defaultFramework) {
			// Only keep the selected framework's content and special pages at the root level
			const rootPage = newTree.children.find(
				(item) => item.type === 'page' && item.url === '/docs'
			);

			// Only include the root page and the framework folder's content
			const newChildren: PageTree.Node[] = [];

			// Add the root page if it exists
			if (rootPage) {
				newChildren.push(rootPage);
			}

			// Add the framework folder's content
			newChildren.push(...frameworkFolder.children);

			// Replace the tree children with our filtered selection
			newTree.children = newChildren;
		}

		// Build a map of shared component URLs for quick lookup
		const sharedComponentUrls = new Set<string>();

		// Find shared component pages at the root level
		for (const item of newTree.children) {
			if (
				item.type === 'folder' &&
				typeof item.name === 'string' &&
				(item.name === 'Components' || item.name === 'hooks')
			) {
				findSharedPages(item, sharedComponentUrls);
			}
		}

		// If we found shared components, make sure they're included in the framework folder
		if (sharedComponentUrls.size > 0) {
			ensureSharedPagesIncluded(
				frameworkFolder,
				sharedComponentUrls,
				currentFramework,
				newTree
			);
		}

		return newTree;
	}, [tree, currentFramework, pathname, defaultFramework]);

	return (
		<TreeContextProvider tree={enhancedTree}>{children}</TreeContextProvider>
	);
}

/**
 * Recursively finds shared component pages and adds their URLs to the set
 */
function findSharedPages(folder: PageTree.Folder, urls: Set<string>) {
	for (const item of folder.children) {
		if (item.type === 'page' && item.url) {
			for (const pattern of SHARED_PATTERNS) {
				if (item.url.includes(pattern.pattern)) {
					urls.add(item.url);
					break;
				}
			}
		} else if (item.type === 'folder') {
			findSharedPages(item, urls);
		}
	}
}

/**
 * Ensures framework folder contains all shared pages
 */
function ensureSharedPagesIncluded(
	frameworkFolder: PageTree.Folder,
	sharedUrls: Set<string>,
	framework: string,
	tree: PageTree.Root
) {
	// Check if the framework already has these pages
	const existingUrls = new Set<string>();

	// Gather existing URLs in the framework
	for (const item of frameworkFolder.children) {
		if (item.type === 'page' && item.url) {
			existingUrls.add(item.url);
		}
	}

	// Keep track of sections that need separators
	const sectionSeparators: Record<SectionName, boolean> = {
		React: false,
		Hooks: false,
	};

	// No need to add anything if the framework already has all shared pages
	if (Array.from(sharedUrls).every((url) => existingUrls.has(url))) {
		return;
	}

	// Add missing shared pages
	// Note: This preserves existing structure if already properly set up
	for (const url of sharedUrls) {
		if (!existingUrls.has(url)) {
			// Find the component page from the original tree to copy its metadata
			const originalPage = findPageByUrl(tree, url);
			if (originalPage) {
				// Determine which section this belongs to
				let section: SectionName | undefined;
				for (const pattern of SHARED_PATTERNS) {
					if (url.includes(pattern.pattern)) {
						section = pattern.section;
						break;
					}
				}

				// Make sure the section separator exists
				if (section && !sectionSeparators[section]) {
					// Find or create separator for this section
					const separatorExists = frameworkFolder.children.some(
						(item) =>
							item.type === 'separator' &&
							typeof item.name === 'string' &&
							item.name.toLowerCase().includes(section.toLowerCase())
					);

					if (!separatorExists) {
						frameworkFolder.children.push({
							type: 'separator',
							name: ` ${section} `,
							$id: `${frameworkFolder.$id}#${Date.now()}`,
						} as PageTree.Separator);
					}

					sectionSeparators[section] = true;
				}

				// Add the shared page to the framework
				const newPage: SharedPageItem = {
					...originalPage,
					// Add a custom property to mark this as a shared page
					sharedPage: true,
					// Adjust the URL to keep it in the current framework context
					frameworkUrl: `/docs/${framework}${url.substring('/docs'.length)}`,
				};

				frameworkFolder.children.push(newPage);
			}
		}
	}
}

/**
 * Helper to find a page by URL in the tree
 */
function findPageByUrl(
	tree: PageTree.Root,
	url: string
): SharedPageItem | null {
	// Search for the page with the matching URL
	let foundPage: SharedPageItem | null = null;

	// Helper function to traverse tree recursively
	function search(nodes: PageTree.Node[]): void {
		if (foundPage) {
			return;
		} // Stop search if page already found

		for (const node of nodes) {
			if (node.type === 'page' && node.url === url) {
				foundPage = node as SharedPageItem;
				return;
			}
			if (node.type === 'folder' && node.children) {
				search(node.children);
			}
		}
	}

	// Start search from top level
	search(tree.children);

	if (foundPage) {
		return foundPage;
	}

	// If not found, return a basic template
	return {
		type: 'page',
		name: url.split('/').pop() || '',
		url: url,
		$id: `shared-${url}`,
	} as SharedPageItem;
}
