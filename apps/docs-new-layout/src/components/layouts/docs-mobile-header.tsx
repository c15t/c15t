'use client';

/**
 * Mobile header component for documentation layout
 *
 * Provides mobile-specific navigation including:
 * - Theme toggle
 * - Search button
 * - Menu toggle with state management
 *
 * @param props - Component properties
 * @param props.onMenuToggle - Callback function when menu is toggled
 * @param props.isMenuOpen - Current state of the mobile menu
 * @returns The mobile header JSX element
 */
interface DocsMobileHeaderProps {
	/** Callback function triggered when menu button is clicked */
	onMenuToggle?: () => void;
	/** Current state of the mobile menu */
	isMenuOpen?: boolean;
}

export function DocsMobileHeader({
	onMenuToggle,
	isMenuOpen = false,
}: DocsMobileHeaderProps) {
	const handleMenuClick = () => {
		onMenuToggle?.();
	};

	return (
		<header className="border-base-200 border-b bg-white px-2 py-2 lg:hidden dark:border-base-800 dark:bg-base-900">
			<div className="flex items-center justify-between gap-4">
				<div className="inline-flex items-center gap-1 rounded-full bg-base-100 p-0.5 transition-colors duration-200 dark:bg-base-800">
					{/* Theme toggle placeholder - could be made interactive later */}
					<button
						type="button"
						className="flex size-6 items-center justify-center rounded-full bg-base-100 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
						aria-label="Toggle theme"
					>
						🌙
					</button>
				</div>
				<button
					type="button"
					className="flex h-9 w-full items-center justify-between rounded-md border border-transparent bg-white px-4 py-2 align-middle text-base-500 text-xs leading-tight placeholder-base-400 shadow-sm ring-1 ring-base-200 transition duration-300 ease-in-out focus:z-10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:ring-offset-white dark:bg-base-900 dark:ring-base-800 dark:focus:ring-offset-base-900"
					aria-label="Search docs"
				>
					<div className="flex items-center gap-2">
						<SearchIcon className="h-4 w-4" />
						<span>Search docs</span>
					</div>
				</button>
				<button
					type="button"
					onClick={handleMenuClick}
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-base-100 font-medium text-base-900 text-sm transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
					aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={isMenuOpen}
				>
					<MenuIcon className="h-4 w-4" isOpen={isMenuOpen} />
				</button>
			</div>
		</header>
	);
}

/**
 * Menu icon component with animated hamburger/close states
 *
 * @param props - Icon properties
 * @param props.className - CSS class names
 * @param props.isOpen - Whether the menu is currently open
 */
interface MenuIconProps {
	className?: string;
	isOpen?: boolean;
}

function MenuIcon({ className, isOpen = false }: MenuIconProps) {
	if (isOpen) {
		// Close icon (X)
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
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		);
	}

	// Hamburger menu icon
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
 *
 * @param props - Icon properties
 * @param props.className - CSS class names
 */
interface SearchIconProps {
	className?: string;
}

function SearchIcon({ className }: SearchIconProps) {
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
