'use client';
import type { TOCItemType } from 'fumadocs-core/server';
import { useActiveAnchors } from 'fumadocs-core/toc';
import { cn } from '../../lib/cn';

/**
 * Table of contents component properties
 *
 * @interface TableOfContentsProps
 */
interface TableOfContentsProps {
	/** Table of contents items */
	toc: TOCItemType[];
}

/**
 * Interactive table of contents component
 *
 * Provides navigation within a page with:
 * - Active section highlighting
 * - Smooth scrolling to sections
 * - Hierarchical structure based on heading depth
 * - Responsive design
 *
 * @param props - The table of contents properties
 * @returns The table of contents JSX element or null if no items
 *
 * @example
 * ```tsx
 * <TableOfContents toc={page.data.toc} />
 * ```
 */
export function TableOfContents({ toc }: TableOfContentsProps) {
	// Don't render if no table of contents items
	if (toc.length === 0) {
		return null;
	}

	return (
		<aside className="hidden w-64 p-4 pl-0 lg:sticky lg:top-14 lg:block lg:self-start">
			<div>
				<h4 className="ml-4 text-base-900 text-sm dark:text-white">
					On this page
				</h4>
				<div className="mt-4 flex h-full flex-col">
					{toc.map((item) => (
						<TocItem key={item.url} item={item} />
					))}
				</div>
			</div>
		</aside>
	);
}

/**
 * Individual table of contents item component
 *
 * @param props - The TOC item properties
 * @returns The TOC item JSX element
 */
function TocItem({ item }: { item: TOCItemType }) {
	const isActive = useActiveAnchors().includes(item.url.slice(1));

	return (
		<a
			href={item.url}
			className={cn(
				'toc-link block select-none border-transparent border-l-2 py-1 text-base-500 text-xs transition-all duration-200 hover:text-accent-600 dark:text-base-400 dark:hover:text-accent-400',
				isActive && 'text-accent-600 dark:text-accent-400'
			)}
			style={{
				paddingLeft: Math.max(0, item.depth - 2) * 16 + 16, // Base padding of 1rem (16px) plus depth
			}}
			data-heading-id={item.url.slice(1)}
			data-heading-depth={item.depth}
		>
			{item.title}
		</a>
	);
}
