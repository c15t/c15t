'use client';
import type { PageTree } from 'fumadocs-core/server';
import { TreeContextProvider } from 'fumadocs-ui/contexts/tree';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { DocumentPaginationProps } from '../navigation/pagination';
import { DocumentPagination } from '../navigation/pagination';
import { DocsDesktopHeader } from './docs-desktop-header';
import { DocsSidebar } from './docs-sidebar';

/**
 * Documentation layout properties
 *
 * @interface DocsLayoutProps
 */
interface DocsLayoutProps {
	/** Page tree for navigation */
	tree: PageTree.Root;
	/** Content to render in the main area */
	children: ReactNode;
	/** Pagination data for navigation between pages */
	pagination?: DocumentPaginationProps;
	/** Additional CSS classes for the container */
	className?: string;
	/** Github stars for the repository */
	githubStars?: number;
}

/**
 * Documentation layout component with fumadocs integration
 *
 * Provides the main layout structure with:
 * - Mobile and desktop headers
 * - Sidebar navigation
 * - Main content area
 * - Responsive design
 * - Tree context for navigation
 *
 * @param props - The documentation layout properties
 * @returns The documentation layout JSX element
 *
 * @example
 * ```tsx
 * <DocsLayout tree={pageTree}>
 *   <YourDocumentationContent />
 * </DocsLayout>
 * ```
 */
export function DocsLayout({
	tree,
	children,
	pagination,
	className,
	githubStars,
}: DocsLayoutProps) {
	return (
		<TreeContextProvider tree={tree}>
			<div
				className={cn('min-h-screen bg-base-100 dark:bg-base-700', className)}
			>
				{/* Mobile header */}
				<div className="bg-base-100 dark:bg-base-700">
					{/* <DocsMobileHeader /> */}
					<div className="flex">
						{/* Sidebar */}
						<DocsSidebar />
						{/* Main content */}
						<div className="min-w-0 flex-1 bg-white lg:mr-1 lg:border-base-200 lg:border-r lg:pl-72 dark:bg-base-900 dark:lg:border-base-800">
							{/* Desktop header */}
							<DocsDesktopHeader githubStars={githubStars} />
							{/* Content */}
							<div className="mx-auto 2xl:max-w-6xl">
								<article>
									{children}
									{/* Pagination */}
									{pagination && (
										<DocumentPagination
											previous={pagination.previous}
											next={pagination.next}
											className={pagination.className}
										/>
									)}
								</article>
							</div>
						</div>
					</div>
				</div>
			</div>
		</TreeContextProvider>
	);
}
