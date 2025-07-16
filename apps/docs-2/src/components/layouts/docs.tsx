'use client';
import { usePathname } from 'fumadocs-core/framework';
import type { PageTree } from 'fumadocs-core/server';
import { TreeContextProvider, useTreeContext } from 'fumadocs-ui/contexts/tree';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import {
	DocumentPagination,
	type DocumentPaginationProps,
} from '../pagination';

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
}

/**
 * Documentation layout component converted from Astro DocsLayout
 *
 * Equivalent to the Astro DocsLayout.astro component, this provides:
 * - BaseLayout foundation with hidden nav/footer
 * - Mobile and desktop top bars
 * - Sidebar navigation with proper borders and rounded corners
 * - Responsive main content area
 * - Integration with fumadocs tree context
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
}: DocsLayoutProps) {
	return (
		<TreeContextProvider tree={tree}>
			<div
				className={cn('min-h-screen bg-base-100 dark:bg-base-700', className)}
			>
				{/* Mobile header */}
				<div className="bg-base-100 dark:bg-base-700">
					<MobileTopBar />
					<div className="flex">
						{/* Sidebar */}
						<Sidebar />
						{/* Main content */}
						<div className="min-w-0 flex-1 bg-white lg:mr-1 lg:border-base-200 lg:border-r lg:pl-72 dark:bg-base-900 dark:lg:border-base-800">
							{/* Desktop header */}
							<DesktopTopBar />
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

/**
 * Mobile top bar component
 *
 * @internal
 * Replace this with your actual mobile navigation component
 */
function MobileTopBar() {
	return (
		<header className="border-base-200 border-b bg-white px-2 py-2 lg:hidden dark:border-base-800 dark:bg-base-900">
			<div className="flex items-center justify-between gap-4">
				<div className="inline-flex items-center gap-1 rounded-full bg-base-100 p-0.5 transition-colors duration-200 dark:bg-base-800">
					{/* Theme toggle placeholder */}
					<button
						type="button"
						className="flex size-6 items-center justify-center rounded-full bg-base-100 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
					>
						🌙
					</button>
				</div>
				<button
					type="button"
					className="flex h-9 w-full items-center justify-between rounded-md border border-transparent bg-white px-4 py-2 align-middle text-base-500 text-xs leading-tight placeholder-base-400 shadow-sm ring-1 ring-base-200 transition duration-300 ease-in-out focus:z-10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:ring-offset-white dark:bg-base-900 dark:ring-base-800 dark:focus:ring-offset-base-900"
				>
					<div className="flex items-center gap-2">
						<SearchIcon className="h-4 w-4" />
						<span>Search docs</span>
					</div>
				</button>
				<button
					type="button"
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-base-100 font-medium text-base-900 text-sm transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
					aria-label="Open menu"
				>
					<MenuIcon className="h-4 w-4" />
				</button>
			</div>
		</header>
	);
}

/**
 * Desktop top bar component
 *
 * @internal
 * Replace this with your actual desktop navigation component
 */
function DesktopTopBar() {
	return (
		<header className="fixed top-0 right-0 left-72 z-50 hidden w-auto bg-base-100 lg:block dark:bg-base-700">
			<div className="flex items-center justify-between gap-4 border-base-200 border-t border-b bg-white px-4 py-2.5 lg:mt-1 lg:mr-1 lg:rounded-tr-xl lg:border-r dark:border-base-800 dark:bg-base-900">
				<div className="w-full max-w-48">
					<button
						type="button"
						className="flex h-9 w-full items-center justify-between rounded-md border border-transparent bg-white px-4 py-2 align-middle text-base-500 text-xs leading-tight placeholder-base-400 shadow-sm ring-1 ring-base-200 transition duration-300 ease-in-out focus:z-10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:ring-offset-white dark:bg-base-900 dark:ring-base-800 dark:focus:ring-offset-base-900"
					>
						<div className="flex items-center gap-2">
							<SearchIcon className="h-4 w-4" />
							<span>Search docs</span>
						</div>
					</button>
				</div>
				<div className="ml-auto flex flex-col gap-2 md:flex-row md:gap-4">
					<a
						href="/system/overview"
						className="text-2xl text-base-500 transition-colors hover:text-base-600 md:text-sm dark:text-base-400 dark:hover:text-base-200"
					>
						Overview
					</a>
					<a
						href="/blog/"
						className="text-2xl text-base-500 transition-colors hover:text-base-600 md:text-sm dark:text-base-400 dark:hover:text-base-200"
					>
						Blog
					</a>
				</div>
				<div className="inline-flex items-center gap-1 rounded-full bg-base-100 p-0.5 transition-colors duration-200 dark:bg-base-800">
					{/* Theme toggle placeholder */}
					<button
						type="button"
						className="flex size-6 items-center justify-center rounded-full bg-base-100 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
					>
						🌙
					</button>
				</div>
			</div>
		</header>
	);
}

/**
 * Sidebar component with fumadocs navigation
 */
function Sidebar() {
	return (
		<aside className="-translate-x-full fixed inset-y-0 z-50 w-72 transform bg-base-100 transition-transform duration-300 ease-in-out lg:top-0 lg:left-0 lg:z-50 lg:translate-x-0 dark:bg-base-700">
			<div className="flex h-full flex-col border-base-200 border-r bg-white lg:mt-1 lg:ml-1 lg:rounded-tl-xl lg:border dark:border-base-800 dark:bg-base-900">
				{/* Sidebar header */}
				<div className="flex h-14 items-center justify-between px-8">
					<a
						href="/"
						className="flex items-center space-x-2 text-base-900 dark:text-white"
					>
						<svg
							className="size-4"
							viewBox="0 0 200 200"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<circle cx="100" cy="100" r="100" fill="currentColor" />
							<circle
								cx="133.333"
								cy="59.2591"
								r="14.8148"
								fill="currentColor"
								className="fill-accent-500"
							/>
						</svg>
						<span className="font-semibold text-lg">ZeroIndex</span>
					</a>
					<button
						type="button"
						className="rounded-md p-2 text-base-400 hover:bg-base-200 hover:text-base-500 lg:hidden"
					>
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
					<SidebarNavigation />
				</nav>

				{/* Bottom section */}
				<div className="relative border-base-200 border-t px-6 py-4 dark:border-base-800">
					<button
						type="button"
						className="flex h-9 items-center justify-center rounded-full bg-base-100 px-6 py-3 font-medium text-base-900 text-sm transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
					>
						Buy ZeroIndex
					</button>
				</div>
			</div>
		</aside>
	);
}

/**
 * Fumadocs-powered sidebar navigation component
 */
function SidebarNavigation() {
	const { root } = useTreeContext();
	const pathname = usePathname();

	const renderNavigationItems = (items: PageTree.Node[]): ReactNode => {
		return items.map((item, index) => {
			if (item.type === 'page') {
				const isActive = pathname === item.url;
				return (
					<a
						key={item.url}
						href={item.url}
						className={cn(
							'block rounded-md px-3 py-2 text-sm transition-colors',
							isActive
								? 'bg-accent-100 font-medium text-accent-900 dark:bg-accent-900/20 dark:text-accent-100'
								: 'text-base-700 hover:bg-base-100 hover:text-base-900 dark:text-base-300 dark:hover:bg-base-800 dark:hover:text-white'
						)}
					>
						{item.icon && <span className="mr-2">{item.icon}</span>}
						{item.name}
					</a>
				);
			}

			if (item.type === 'folder') {
				return (
					<div key={item.$id} className="space-y-1">
						{item.index ? (
							<a
								href={item.index.url}
								className={cn(
									'block rounded-md px-3 py-2 font-medium text-sm transition-colors',
									pathname === item.index.url
										? 'bg-accent-100 text-accent-900 dark:bg-accent-900/20 dark:text-accent-100'
										: 'text-base-900 hover:bg-base-100 hover:text-base-900 dark:text-white dark:hover:bg-base-800'
								)}
							>
								{item.icon && <span className="mr-2">{item.icon}</span>}
								{item.name}
							</a>
						) : (
							<div className="px-3 py-2 font-medium text-base-900 text-sm dark:text-white">
								{item.icon && <span className="mr-2">{item.icon}</span>}
								{item.name}
							</div>
						)}
						<div className="ml-4 space-y-1">
							{renderNavigationItems(item.children)}
						</div>
					</div>
				);
			}

			if (item.type === 'separator') {
				return (
					<div
						key={index}
						className="px-3 py-2 font-medium text-base-500 text-xs uppercase tracking-wide dark:text-base-400"
					>
						{item.icon && <span className="mr-2">{item.icon}</span>}
						{item.name}
					</div>
				);
			}

			return null;
		});
	};

	return (
		<div className="space-y-1">{renderNavigationItems(root.children)}</div>
	);
}

/**
 * Menu icon component
 */
function MenuIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	);
}

/**
 * Search icon component
 */
function SearchIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
	);
}
