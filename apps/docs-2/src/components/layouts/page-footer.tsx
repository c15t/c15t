'use client';
import { Link, usePathname } from 'fumadocs-core/framework';
import type { PageTree } from 'fumadocs-core/server';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import { useMemo } from 'react';

/**
 * Page footer component with previous/next navigation
 *
 * Provides navigation between pages based on the page tree structure:
 * - Automatically finds previous and next pages
 * - Shows page titles with hover effects
 * - Responsive grid layout
 * - Proper ARIA labeling
 *
 * @returns The page footer JSX element or null if no navigation
 */
export function PageFooter() {
	const { root } = useTreeContext();
	const pathname = usePathname();
	
	const flatten = useMemo(() => {
		const result: PageTree.Item[] = [];

		function scan(items: PageTree.Node[]) {
			for (const item of items) {
				if (item.type === 'page') {
					result.push(item);
				} else if (item.type === 'folder') {
					if (item.index) {
						result.push(item.index);
					}
					scan(item.children);
				}
			}
		}

		scan(root.children);
		return result;
	}, [root]);

	const { previous, next } = useMemo(() => {
		const idx = flatten.findIndex((item) => item.url === pathname);

		if (idx === -1) {
			return {};
		}
		return {
			previous: flatten[idx - 1],
			next: flatten[idx + 1],
		};
	}, [flatten, pathname]);

	// Don't render if no navigation items
	if (!previous && !next) {
		return null;
	}

	return (
		<nav
			aria-label="Documentation pagination"
			className="grid w-full grid-cols-1 divide-y divide-base-200 border-base-200 border-t md:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-base-800 dark:border-base-800"
		>
			<div className="w-full">
				{previous ? (
					<Link
						href={previous.url}
						className="group flex w-full flex-col gap-12 p-8 duration-200 hover:bg-base-50 dark:hover:bg-white/1"
					>
						<span className="font-medium font-mono text-base-500 text-xs uppercase tracking-wide dark:text-base-400">
							Previous
						</span>
						<div>
							<div className="truncate font-medium text-base-900 text-sm transition-colors group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-400">
								{previous.name}
							</div>
						</div>
					</Link>
				) : (
					<div className="w-full p-8" />
				)}
			</div>
			<div className="w-full">
				{next ? (
					<Link
						href={next.url}
						className="group flex w-full flex-col justify-end gap-12 p-8 duration-200 hover:bg-base-50 dark:hover:bg-white/1"
					>
						<span className="font-medium font-mono text-base-500 text-xs uppercase tracking-wide dark:text-base-400">
							Next
						</span>
						<div className="truncate font-medium text-base-900 text-sm transition-colors group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-400">
							{next.name}
						</div>
					</Link>
				) : (
					<div className="w-full p-8" />
				)}
			</div>
		</nav>
	);
} 