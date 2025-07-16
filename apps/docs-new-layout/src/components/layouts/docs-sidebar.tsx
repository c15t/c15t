'use client';

import { usePathname } from 'fumadocs-core/framework';
import type { PageTree } from 'fumadocs-core/server';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import { cn } from '../../lib/cn';

/**
 * Documentation sidebar component with fumadocs integration
 *
 * Provides navigation sidebar with:
 * - Tree-based navigation structure from context
 * - Active page highlighting
 * - Responsive design
 * - Brand header
 * - Mobile menu state management
 *
 * @param props - Component properties
 * @param props.isOpen - Whether the mobile menu is open
 * @param props.onClose - Callback function to close the mobile menu
 * @returns The sidebar JSX element
 */
interface DocsSidebarProps {
	/** Whether the mobile menu is currently open */
	isOpen?: boolean;
	/** Callback function triggered when mobile menu should be closed */
	onClose?: () => void;
}

export function DocsSidebar({ isOpen = false, onClose }: DocsSidebarProps) {
	const handleCloseMobile = () => {
		onClose?.();
	};

	return (
		<>
			{/* Mobile overlay */}
			{isOpen && (
				<div
					className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
					onClick={handleCloseMobile}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							handleCloseMobile();
						}
					}}
					role="button"
					tabIndex={0}
					aria-label="Close menu"
				/>
			)}

			{/* Sidebar */}
			<aside
				className={cn(
					'fixed inset-y-0 z-50 w-72 transform bg-base-100 transition-transform duration-300 ease-in-out lg:top-0 lg:left-0 lg:z-50 lg:translate-x-0 dark:bg-base-700',
					isOpen ? 'translate-x-0' : '-translate-x-full'
				)}
			>
				<div className="flex h-full flex-col border-base-200 border-r bg-white lg:mt-1 lg:ml-1 lg:rounded-tl-xl lg:border dark:border-base-800 dark:bg-base-900">
					{/* Sidebar header */}
					<div className="flex h-14 items-center justify-between px-8">
						<a
							href="/"
							className="flex items-center space-x-2 text-base-900 dark:text-white"
							onClick={handleCloseMobile}
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
							<span className="font-semibold text-lg">c15t</span>
						</a>
						<button
							type="button"
							onClick={handleCloseMobile}
							className="rounded-md p-2 text-base-400 hover:bg-base-200 hover:text-base-500 lg:hidden"
							aria-label="Close menu"
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
						<SidebarNavigation onLinkClick={handleCloseMobile} />
					</nav>

					{/* Bottom section */}
					<div className="relative border-base-200 border-t px-6 py-4 dark:border-base-800">
						<button
							type="button"
							className="flex h-9 items-center justify-center rounded-full bg-base-100 px-6 py-3 font-medium text-base-900 text-sm transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
						>
							c15t
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}

/**
 * Fumadocs-powered sidebar navigation component
 *
 * @param props - Component properties
 * @param props.onLinkClick - Callback function triggered when a navigation link is clicked
 */
interface SidebarNavigationProps {
	/** Callback function triggered when a navigation link is clicked */
	onLinkClick?: () => void;
}

function SidebarNavigation({ onLinkClick }: SidebarNavigationProps) {
	const { root } = useTreeContext();
	const pathname = usePathname();

	const renderNavigationItems = (items: PageTree.Node[]) => {
		return items.map((item, index) => {
			if (item.type === 'page') {
				const isActive = pathname === item.url;
				return (
					<a
						key={item.url}
						href={item.url}
						onClick={onLinkClick}
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
								onClick={onLinkClick}
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
