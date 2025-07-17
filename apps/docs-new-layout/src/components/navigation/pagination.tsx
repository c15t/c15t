import Link from 'next/link';
import { cn } from '../../lib/utils';

/**
 * Navigation item for pagination
 *
 * @interface PaginationItem
 */
interface PaginationItem {
	/** The title of the page */
	title: string;
	/** The URL to navigate to */
	href: string;
	/** Optional category/section name */
	category?: string;
}

/**
 * Documentation pagination component properties
 *
 * @interface DocumentPaginationProps
 */
export interface DocumentPaginationProps {
	/** Previous page navigation item */
	previous?: PaginationItem;
	/** Next page navigation item */
	next?: PaginationItem;
	/** Additional CSS classes for the container */
	className?: string;
}

/**
 * Documentation pagination component that provides navigation between pages
 *
 * Displays previous and next page links in a responsive grid layout with:
 * - Previous page link on the left
 * - Next page link on the right
 * - Hover effects and smooth transitions
 * - Support for optional page categories
 * - Proper ARIA labeling for accessibility
 *
 * @param props - The pagination properties
 * @returns The documentation pagination JSX element
 *
 * @throws {Error} When neither previous nor next items are provided
 *
 * @example
 * ```tsx
 * <DocumentPagination
 *   previous={{
 *     title: "Quick Start Guide",
 *     href: "/docs/getting-started/quick-start",
 *     category: "getting started"
 *   }}
 *   next={{
 *     title: "Sidebar",
 *     href: "/docs/navigation/sidebar",
 *     category: "navigation"
 *   }}
 * />
 * ```
 */
export function DocumentPagination({
	previous,
	next,
	className,
}: DocumentPaginationProps) {
	// Don't render if no navigation items provided
	if (!previous && !next) {
		return null;
	}

	return (
		<nav
			aria-label="Documentation pagination"
			className={cn(
				'grid w-full grid-cols-1 divide-y divide-base-200 border-base-200 border-t',
				'md:grid-cols-2 md:divide-x md:divide-y-0',
				'dark:divide-base-800 dark:border-base-800',
				className
			)}
		>
			{/* Previous page */}
			<div className="w-full">
				{previous ? (
					<Link
						href={previous.href}
						className={cn(
							'group flex w-full flex-col gap-3 p-6 transition-colors duration-200',
							'hover:bg-base-50 dark:hover:bg-white/5'
						)}
					>
						<span className="font-medium font-mono text-base-500 text-xs uppercase tracking-wide dark:text-base-400">
							Previous
						</span>
						<div>
							<div
								className={cn(
									'truncate font-medium text-base-900 text-sm transition-colors dark:text-white',
									'group-hover:text-accent-600 dark:group-hover:text-accent-400'
								)}
							>
								{previous.title}
							</div>
							{previous.category && (
								<div className="text-base-500 text-xs capitalize dark:text-base-400">
									{previous.category}
								</div>
							)}
						</div>
					</Link>
				) : (
					<div className="w-full p-6" /> // Empty space to maintain layout
				)}
			</div>

			{/* Next page */}
			<div className="w-full">
				{next ? (
					<Link
						href={next.href}
						className={cn(
							'group flex w-full flex-col justify-end gap-3 p-6 transition-colors duration-200',
							'hover:bg-base-50 dark:hover:bg-white/5'
						)}
					>
						<span className="font-medium font-mono text-base-500 text-xs uppercase tracking-wide dark:text-base-400">
							Next
						</span>
						<div
							className={cn(
								'truncate font-medium text-base-900 text-sm transition-colors dark:text-white',
								'group-hover:text-accent-600 dark:group-hover:text-accent-400'
							)}
						>
							{next.title}
						</div>
						{next.category && (
							<div className="text-base-500 text-xs capitalize dark:text-base-400">
								{next.category}
							</div>
						)}
					</Link>
				) : (
					<div className="w-full p-6" /> // Empty space to maintain layout
				)}
			</div>
		</nav>
	);
}
