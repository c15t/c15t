'use client';

import { usePathname } from 'fumadocs-core/framework';
import type { PageTree } from 'fumadocs-core/server';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import { FrameworkDropdown } from './framework-dropdown';

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
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
					<div className="flex h-14 items-center justify-center px-8 pb-4">
						<Link
							href="/"
							className="flex items-center space-x-2 text-base-900 dark:text-white"
							onClick={handleCloseMobile}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 1225 448"
								className="h-7"
							>
								<title>c15t logo</title>
								<path
									fill="currentColor"
									d="M223.178 2.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.886 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 194.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 42.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315ZM642.386 259.532c0-55.44 43.92-96.12 98.64-96.12 27 0 51.84 9 72.72 31.32l-26.64 27.72c-12.24-12.6-26.64-19.8-46.08-19.8-31.68 0-55.8 24.12-55.8 56.88 0 32.76 24.12 56.88 55.8 56.88 19.44 0 33.84-7.2 46.08-19.8l26.64 27.72c-20.88 22.32-45.72 31.32-72.72 31.32-54.72 0-98.64-40.68-98.64-96.12Zm211.117-119.16h-35.64v-40.68h80.64v250.92h-45v-210.24Zm70.403 163.8 36.72-20.88c8.64 18.36 27.72 30.6 49.324 30.6 30.6 0 51.12-19.08 51.12-47.52 0-28.44-19.44-47.52-48.6-47.52-14.044 0-28.444 4.32-37.444 12.96l-32.4-8.64 23.4-123.48h121.684v40.68h-87.844l-9 45.36c7.56-3.24 16.564-4.68 26.284-4.68 53.28 0 88.56 33.84 88.56 84.96 0 53.28-38.16 88.92-95.76 88.92-37.804 0-70.564-20.52-86.044-50.76Zm217.154-95.76h-23.4v-39.24h23.4v-69.48h43.2v69.48h39.24v39.24h-39.24v142.2h-43.2v-142.2Z"
								/>
							</svg>
						</Link>
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
					<div className="flex items-center justify-center px-4 ">
						<FrameworkDropdown />
					</div>
					{/* Navigation */}
					<nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
						<SidebarNavigation onLinkClick={handleCloseMobile} />
					</nav>

					{/* Bottom section
					<div className="relative border-base-200 border-t px-6 py-4 dark:border-base-800">
						<button
							type="button"
							className="flex h-9 items-center justify-center rounded-full bg-base-100 px-6 py-3 font-medium text-base-900 text-sm transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
						>
							c15t
						</button>
					</div> */}
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
